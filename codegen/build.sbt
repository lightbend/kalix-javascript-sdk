lazy val `kalix-codegen` =
  project
    .in(file("."))
    .enablePlugins(AutomateHeaderPlugin)
    .settings(commonSettings ++ Seq(publish / skip := true))
    .aggregate(`kalix-codegen-core`, `kalix-codegen-js`, `kalix-codegen-js-cli`)

lazy val `kalix-codegen-core` =
  project
    .in(file("core"))
    .enablePlugins(AutomateHeaderPlugin)
    .settings(commonSettings)
    .settings(
      libraryDependencies ++= Seq(
        library.kalixSdkProtocol % "protobuf-src",
        library.scalapbRuntime % "protobuf",
        library.protobufJava,
        library.munit % Test,
        library.munitScalaCheck % Test),
      Compile / PB.targets := Seq(PB.gens.java -> (Compile / sourceManaged).value))

lazy val `kalix-codegen-js` =
  project
    .in(file("js-gen"))
    .enablePlugins(AutomateHeaderPlugin)
    .settings(commonSettings)
    .settings(
      libraryDependencies ++= Seq(
        library.kiama,
        library.commonsIo % Test,
        library.munit % Test,
        library.munitScalaCheck % Test))
    .dependsOn(`kalix-codegen-core`)

lazy val cachedNativeImage =
  taskKey[File]("A cached version of the nativeImage task key, that only rebuilds when required.")

lazy val `kalix-codegen-js-cli` =
  project
    .in(file("js-gen-cli"))
    .configs(IntegrationTest)
    .enablePlugins(AutomateHeaderPlugin, BuildInfoPlugin, NativeImagePlugin)
    .settings(commonSettings, Defaults.itSettings)
    .settings(
      buildInfoKeys := Seq[BuildInfoKey](version),
      buildInfoPackage := "io.kalix.codegen.js",
      NativeImage / name := "kalix-codegen-js",
      nativeImageVersion := "22.1.0",
      /**
       * Due to limitations of the Windows command prompt/PowerShell, with a the native-image command fails with a long
       * classpath By using sbt-assembly, we first build a fat JAR which is then able to be used in place of the full
       * classpath
       *
       * This has been raised as an issue against the plugin: https://github.com/scalameta/sbt-native-image/issues/26
       */
      Compile / fullClasspath := Seq(Attributed(assembly.value)(AttributeMap.empty)),
      cachedNativeImage := Def.taskDyn {
        import sbt.util.CacheImplicits._

        val store = streams.value.cacheStoreFactory.make("assembled-jar-info-cache")

        val trackedNativeImage =
          Tracked.inputChanged[ModifiedFileInfo, Def.Initialize[Task[File]]](store) { case (fatJarChanged, _) =>
            if (fatJarChanged) {
              // Assembled fat JAR has changed, rebuild native image
              nativeImage
            } else {
              streams.value.log.info(s"Native image up to date: ${nativeImageOutput.value}")
              nativeImageOutput.toTask
            }
          }

        trackedNativeImage(FileInfo.lastModified(assembly.value))
      }.value,
      nativeImageAgentMerge := true,
      nativeImageOptions ++= Seq(
        "--no-fallback",
        "-H:JNIConfigurationFiles=" + (Compile / resourceDirectory).value / "jni-config.json",
        "-H:DynamicProxyConfigurationFiles=" + (Compile / resourceDirectory).value / "proxy-config.json",
        "-H:ReflectionConfigurationFiles=" + (Compile / resourceDirectory).value / "reflect-config.json",
        "-H:ResourceConfigurationFiles=" + (Compile / resourceDirectory).value / "resource-config.json"),
      libraryDependencies ++= Seq(
        library.scopt,
        library.munit % "it,test",
        library.munitScalaCheck % "it,test",
        library.logback % "it",
        library.requests % "it",
        library.testcontainers % "it",
        library.typesafeConfig % "it"),
      IntegrationTest / testOptions += Tests.Argument(s"-Djs-codegen-cli.native-image=${cachedNativeImage.value}"),
      publish / skip := true)
    .dependsOn(`kalix-codegen-js`)

// *****************************************************************************
// Library dependencies
// *****************************************************************************

lazy val library =
  new {
    object Version {
      val kalix = "1.1.0" // FIXME pick up supported protocol/proxy version from node project?
      val munit = "0.7.29"
    }
    val commonsIo = "commons-io" % "commons-io" % "2.11.0"
    val kiama = "org.bitbucket.inkytonik.kiama" %% "kiama" % "2.4.0"
    val logback = "ch.qos.logback" % "logback-classic" % "1.2.12"
    val munit = "org.scalameta" %% "munit" % Version.munit
    val munitScalaCheck = "org.scalameta" %% "munit-scalacheck" % Version.munit
    val protobufJava = "com.google.protobuf" % "protobuf-java" % "3.22.4"
    val requests = "com.lihaoyi" %% "requests" % "0.6.9"
    val scopt = "com.github.scopt" %% "scopt" % "4.1.0"
    val testcontainers = "org.testcontainers" % "testcontainers" % "1.15.3"
    val typesafeConfig = "com.typesafe" % "config" % "1.4.2"
    val kalixSdkProtocol =
      "io.kalix" % "kalix-sdk-protocol" % Version.kalix
    val scalapbRuntime =
      "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion
  }

// *****************************************************************************
// Settings
// *****************************************************************************

lazy val commonSettings =
  Seq(
    scalaVersion := "2.13.10",
    organization := "io.kalix",
    organizationName := "Lightbend Inc",
    startYear := Some(2021),
    scalacOptions ++= Seq("-unchecked", "-deprecation", "-language:_", "-encoding", "UTF-8", "-Ywarn-unused:imports"),
    testFrameworks += new TestFramework("munit.Framework"),
    scalafmtOnCompile := true,
    headerLicense := Some(HeaderLicense.Custom("""|Copyright (c) Lightbend Inc. 2021
           |
           |""".stripMargin)),
    // Publishing
    publishTo := Some("Cloudsmith API".at("https://maven.cloudsmith.io/lightbend/kalix/")),
    pomIncludeRepository := { x => false },
    credentials += Credentials(
      "Cloudsmith API",
      "maven.cloudsmith.io",
      sys.env.getOrElse("CLOUDSMITH_USER", ""),
      sys.env.getOrElse("CLOUDSMITH_PASS", "")),
    // Assembly
    assembly / assemblyMergeStrategy := {
      case s if s.endsWith(".proto") =>
        MergeStrategy.first
      case "module-info.class" => MergeStrategy.discard
      case s                   => MergeStrategy.defaultMergeStrategy(s)
    })
