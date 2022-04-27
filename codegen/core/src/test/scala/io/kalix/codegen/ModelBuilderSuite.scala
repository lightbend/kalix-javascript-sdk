/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen

import java.io.FileInputStream
import java.nio.file.Paths

import scala.collection.mutable
import scala.jdk.CollectionConverters._
import scala.util.Using

import com.google.protobuf.DescriptorProtos.FileDescriptorSet
import com.google.protobuf.Descriptors
import com.google.protobuf.ExtensionRegistry

object ModelBuilderSuite {
  trait Config {
    def label: String
    def registry: ExtensionRegistry
    def descriptorSetPath: String
  }
  object CodegenAnnotationConfig extends Config {
    override val label: String = "CodegenAnnotation"
    override val descriptorSetPath: String = "codegen-annotation/descriptor-sets"

    def registry: ExtensionRegistry = {
      val reg = ExtensionRegistry.newInstance()
      reg.add(kalix.Annotations.method)
      reg.add(kalix.Annotations.codegen)
      reg
    }

  }
  object ServiceAnnotationConfig extends Config {
    override val label: String = "ServiceAnnotation"
    override val descriptorSetPath: String = "service-annotation/descriptor-sets"

    def registry: ExtensionRegistry = {
      val reg = ExtensionRegistry.newInstance()
      reg.add(kalix.Annotations.service)
      reg.add(kalix.Annotations.file)
      reg.add(kalix.Annotations.method)
      reg
    }
  }

  def command(
      fqn: FullyQualifiedName,
      inputType: FullyQualifiedName,
      outputType: FullyQualifiedName,
      streamedInput: Boolean = false,
      streamedOutput: Boolean = false): ModelBuilder.Command =
    ModelBuilder.Command(fqn, inputType, outputType, streamedInput, streamedOutput)
}

abstract class ModelBuilderSuite(val config: ModelBuilderSuite.Config) extends munit.FunSuite {
  import ModelBuilderSuite._

  def derivePackageForEntity(servicePackage: PackageNaming, domainPackage: PackageNaming): PackageNaming

  test(s"EventSourcedEntity introspection (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/event-sourced-shoppingcart.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors: mutable.Seq[Descriptors.FileDescriptor] =
        fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartApi"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val googleEmptyPackage =
        PackageNaming(
          "Empty",
          "google.protobuf",
          Some("google.golang.org/protobuf/types/known/emptypb"),
          Some("com.google.protobuf"),
          Some("EmptyProto"),
          javaMultipleFiles = true)

      val derivedEntityPackage = derivePackageForEntity(shoppingCartPackage, domainPackage)

      val entity =
        ModelBuilder.EventSourcedEntity(
          FullyQualifiedName("ShoppingCart", derivedEntityPackage),
          "shopping-cart",
          Some(ModelBuilder.State(FullyQualifiedName("Cart", domainPackage))),
          List(
            ModelBuilder.Event(FullyQualifiedName("ItemAdded", domainPackage)),
            ModelBuilder.Event(FullyQualifiedName("ItemRemoved", domainPackage))))

      assertEquals(model.entities, Map(entity.fqn.fullName -> entity))

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartService" ->
          ModelBuilder.EntityService(
            FullyQualifiedName("ShoppingCartService", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("AddItem", shoppingCartPackage),
                FullyQualifiedName("AddLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("RemoveItem", shoppingCartPackage),
                FullyQualifiedName("RemoveLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("GetCart", shoppingCartPackage),
                FullyQualifiedName("GetShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Cart", shoppingCartPackage))),
            entity.fqn.fullName)))
    }.get
  }

  test(s"ValueEntity introspection (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/value-shoppingcart.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartApi"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val googleEmptyPackage =
        PackageNaming(
          "Empty",
          "google.protobuf",
          Some("google.golang.org/protobuf/types/known/emptypb"),
          Some("com.google.protobuf"),
          Some("EmptyProto"),
          javaMultipleFiles = true)

      val derivedEntityPackage = derivePackageForEntity(shoppingCartPackage, domainPackage)

      val entity = ModelBuilder.ValueEntity(
        FullyQualifiedName("ShoppingCart", derivedEntityPackage),
        "shopping-cart",
        ModelBuilder.State(FullyQualifiedName("Cart", domainPackage)))

      assertEquals(model.entities, Map(entity.fqn.fullName -> entity))

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartService" ->
          ModelBuilder.EntityService(
            FullyQualifiedName("ShoppingCartService", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("Create", shoppingCartPackage),
                FullyQualifiedName("CreateCart", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("AddItem", shoppingCartPackage),
                FullyQualifiedName("AddLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("RemoveItem", shoppingCartPackage),
                FullyQualifiedName("RemoveLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("GetCart", shoppingCartPackage),
                FullyQualifiedName("GetShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Cart", shoppingCartPackage)),
              command(
                FullyQualifiedName("RemoveCart", shoppingCartPackage),
                FullyQualifiedName("RemoveShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage))),
            entity.fqn.fullName)))
    }.get
  }

  test(s"Action introspection (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/action-shoppingcart.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model =
        ModelBuilder
          .introspectProtobufClasses(descriptors)
          .copy(entities = Map.empty) // remove value entity, we don't need to assert it

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartControllerApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartController"),
          javaMultipleFiles = false)

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartAction" ->
          ModelBuilder.ActionService(
            FullyQualifiedName("ShoppingCartAction", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("InitializeCart", shoppingCartPackage),
                FullyQualifiedName("NewCart", shoppingCartPackage),
                FullyQualifiedName("NewCartCreated", shoppingCartPackage)),
              command(
                FullyQualifiedName("CreatePrePopulated", shoppingCartPackage),
                FullyQualifiedName("NewCart", shoppingCartPackage),
                FullyQualifiedName("NewCartCreated", shoppingCartPackage))),
            None)))
    }.get
  }

  test(s"View introspection (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/view-shoppingcart.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.foldLeft(List.empty[Descriptors.FileDescriptor])((acc, file) =>
        acc :+ Descriptors.FileDescriptor.buildFrom(file, acc.toArray, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingCartViewModel",
          "com.example.shoppingcart.view",
          None,
          None,
          Some("ShoppingCartViewModel"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val transformedUpdates =
        List(
          command(
            FullyQualifiedName("ProcessAdded", shoppingCartPackage),
            FullyQualifiedName("ItemAdded", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)),
          command(
            FullyQualifiedName("ProcessRemoved", shoppingCartPackage),
            FullyQualifiedName("ItemRemoved", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)),
          command(
            FullyQualifiedName("ProcessCheckedOut", shoppingCartPackage),
            FullyQualifiedName("CheckedOut", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)))

      val queries = List(
        command(
          FullyQualifiedName("GetCheckedOutCarts", shoppingCartPackage),
          FullyQualifiedName("GetCheckedOutCartsRequest", shoppingCartPackage),
          FullyQualifiedName("CartViewState", shoppingCartPackage),
          streamedOutput = true))

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.view.ShoppingCartViewService" ->
          ModelBuilder.ViewService(
            FullyQualifiedName("ShoppingCartViewService", shoppingCartPackage),
            transformedUpdates ++ queries,
            "ShoppingCartViewService",
            transformedUpdates,
            None)))
    }.get
  }

  test(s"deriving java package from proto options (${config.label})") {
    val name = "Name"
    val pkg = "com.example"

    assertEquals(PackageNaming(name, pkg, None, None, None, javaMultipleFiles = false).javaPackage, pkg)
    assertEquals(
      PackageNaming(name, pkg, None, Some("override.package"), None, javaMultipleFiles = false).javaPackage,
      "override.package")
  }

  test(s"resolving full names (${config.label})") {
    val pkg = "com.example"

    assertEquals(ModelBuilder.resolveFullName(pkg, "Test"), "com.example.Test")
    assertEquals(ModelBuilder.resolveFullName(pkg, ".sub.Test"), "com.example.sub.Test")
    assertEquals(ModelBuilder.resolveFullName(pkg, "other.package.Test"), "other.package.Test")
  }
}

class ModelBuilderWithCodegenAnnotationSuite extends ModelBuilderSuite(ModelBuilderSuite.CodegenAnnotationConfig) {

  import ModelBuilderSuite._
  test(s"EventSourcedEntity introspection with unnamed entity (${config.label})") {

    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/event-sourced-shoppingcart-unnamed.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors: mutable.Seq[Descriptors.FileDescriptor] =
        fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartApi"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val googleEmptyPackage =
        PackageNaming(
          "Empty",
          "google.protobuf",
          Some("google.golang.org/protobuf/types/known/emptypb"),
          Some("com.google.protobuf"),
          Some("EmptyProto"),
          javaMultipleFiles = true)

      val entity =
        ModelBuilder.EventSourcedEntity(
          // this is the name as defined in the proto file
          FullyQualifiedName("ShoppingCartServiceEntity", shoppingCartPackage),
          "shopping-cart",
          Some(ModelBuilder.State(FullyQualifiedName("Cart", domainPackage))),
          List(
            ModelBuilder.Event(FullyQualifiedName("ItemAdded", domainPackage)),
            ModelBuilder.Event(FullyQualifiedName("ItemRemoved", domainPackage))))

      assertEquals(model.entities, Map(entity.fqn.fullName -> entity))

      // unnamed entities get their name derived from service name (name + Entity)
      // ShoppingCartService => ShoppingCartServiceEntity
      val generatedEntity = model.entities(entity.fqn.fullName)
      assertEquals(generatedEntity.fqn.name, "ShoppingCartServiceEntity")
      assertEquals(generatedEntity.fqn.parent.pkg, "com.example.shoppingcart")

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartService" -> ModelBuilder.EntityService(
            FullyQualifiedName("ShoppingCartService", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("AddItem", shoppingCartPackage),
                FullyQualifiedName("AddLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("RemoveItem", shoppingCartPackage),
                FullyQualifiedName("RemoveLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("GetCart", shoppingCartPackage),
                FullyQualifiedName("GetShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Cart", shoppingCartPackage))),
            entity.fqn.fullName)))
    }.get
  }

  test(s"ValueEntity introspection with unnamed entity (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/value-shoppingcart-unnamed.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartApi"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val googleEmptyPackage =
        PackageNaming(
          "Empty",
          "google.protobuf",
          Some("google.golang.org/protobuf/types/known/emptypb"),
          Some("com.google.protobuf"),
          Some("EmptyProto"),
          javaMultipleFiles = true)

      val entity = ModelBuilder.ValueEntity(
        FullyQualifiedName("ShoppingCartServiceEntity", shoppingCartPackage),
        "shopping-cart",
        ModelBuilder.State(FullyQualifiedName("Cart", domainPackage)))

      assertEquals(model.entities, Map(entity.fqn.fullName -> entity))

      // unnamed entities get their name derived from service name (name + Entity)
      // ShoppingCartService => ShoppingCartServiceEntity
      val generatedEntity = model.entities(entity.fqn.fullName)
      assertEquals(generatedEntity.fqn.name, "ShoppingCartServiceEntity")
      assertEquals(generatedEntity.fqn.parent.pkg, "com.example.shoppingcart")

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartService" ->
          ModelBuilder.EntityService(
            FullyQualifiedName("ShoppingCartService", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("Create", shoppingCartPackage),
                FullyQualifiedName("CreateCart", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("AddItem", shoppingCartPackage),
                FullyQualifiedName("AddLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("RemoveItem", shoppingCartPackage),
                FullyQualifiedName("RemoveLineItem", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage)),
              command(
                FullyQualifiedName("GetCart", shoppingCartPackage),
                FullyQualifiedName("GetShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Cart", shoppingCartPackage)),
              command(
                FullyQualifiedName("RemoveCart", shoppingCartPackage),
                FullyQualifiedName("RemoveShoppingCart", shoppingCartPackage),
                FullyQualifiedName("Empty", googleEmptyPackage))),
            entity.fqn.fullName)))
    }.get
  }

  // for Actions we must do the inverted test. Legacy test is unnamed, so we test the named case
  test(s"Action introspection with named action (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/action-shoppingcart-named.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.map(Descriptors.FileDescriptor.buildFrom(_, Array.empty, true))

      val model =
        ModelBuilder
          .introspectProtobufClasses(descriptors)
          .copy(entities = Map.empty) // remove value entity, we don't need to assert it

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingcartControllerApi",
          "com.example.shoppingcart",
          None,
          None,
          Some("ShoppingCartController"),
          javaMultipleFiles = false)

      val derivedShoppingCartPackage = shoppingCartPackage

      val userDefinedNamePackage =
        shoppingCartPackage.copy(pkg = "com.example.shoppingcart.controllers")

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.ShoppingCartAction" ->
          ModelBuilder.ActionService(
            FullyQualifiedName("ShoppingCartAction", shoppingCartPackage),
            List(
              command(
                FullyQualifiedName("InitializeCart", shoppingCartPackage),
                FullyQualifiedName("NewCart", shoppingCartPackage),
                FullyQualifiedName("NewCartCreated", shoppingCartPackage)),
              command(
                FullyQualifiedName("CreatePrePopulated", shoppingCartPackage),
                FullyQualifiedName("NewCart", shoppingCartPackage),
                FullyQualifiedName("NewCartCreated", shoppingCartPackage))),
            // this is the name as defined in the proto file
            Some(FullyQualifiedName("ShoppingCartController", userDefinedNamePackage)))))
    }.get
  }

  // for Views we must do the inverted test. Legacy test is unnamed, so we test the named case
  test(s"View introspection with named view (${config.label})") {
    val testFilesPath = Paths.get(getClass.getClassLoader.getResource("test-files").toURI)
    val descriptorFilePath =
      testFilesPath.resolve(config.descriptorSetPath + "/view-shoppingcart-named.desc")

    Using(new FileInputStream(descriptorFilePath.toFile)) { fis =>
      val fileDescSet = FileDescriptorSet.parseFrom(fis, config.registry)
      val fileList = fileDescSet.getFileList.asScala

      val descriptors = fileList.foldLeft(List.empty[Descriptors.FileDescriptor])((acc, file) =>
        acc :+ Descriptors.FileDescriptor.buildFrom(file, acc.toArray, true))

      val model = ModelBuilder.introspectProtobufClasses(descriptors)

      val shoppingCartPackage =
        PackageNaming(
          "ShoppingCartViewModel",
          "com.example.shoppingcart.view",
          None,
          None,
          Some("ShoppingCartViewModel"),
          javaMultipleFiles = false)

      val domainPackage =
        PackageNaming(
          "ShoppingcartDomain",
          "com.example.shoppingcart.domain",
          None,
          None,
          Some("ShoppingCartDomain"),
          javaMultipleFiles = false)

      val userDefinedNamePackage =
        shoppingCartPackage.copy(pkg = "com.example.shoppingcart.view")

      val transformedUpdates =
        List(
          command(
            FullyQualifiedName("ProcessAdded", shoppingCartPackage),
            FullyQualifiedName("ItemAdded", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)),
          command(
            FullyQualifiedName("ProcessRemoved", shoppingCartPackage),
            FullyQualifiedName("ItemRemoved", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)),
          command(
            FullyQualifiedName("ProcessCheckedOut", shoppingCartPackage),
            FullyQualifiedName("CheckedOut", domainPackage),
            FullyQualifiedName("CartViewState", shoppingCartPackage)))

      val queries = List(
        command(
          FullyQualifiedName("GetCheckedOutCarts", shoppingCartPackage),
          FullyQualifiedName("GetCheckedOutCartsRequest", shoppingCartPackage),
          FullyQualifiedName("CartViewState", shoppingCartPackage),
          streamedOutput = true))

      assertEquals(
        model.services,
        Map(
          "com.example.shoppingcart.view.ShoppingCartViewService" ->
          ModelBuilder.ViewService(
            FullyQualifiedName("ShoppingCartViewService", shoppingCartPackage),
            transformedUpdates ++ queries,
            "ShoppingCartViewService",
            transformedUpdates,
            // this is the name as defined in the proto file
            Some(FullyQualifiedName("ShoppingCartView", userDefinedNamePackage)))))
    }.get
  }

  override def derivePackageForEntity(servicePackage: PackageNaming, domainPackage: PackageNaming): PackageNaming = {
    // Entities don't have a proto package so we need to build one for them
    // since they are declared in a Service annotation, we stay with this package,
    // but we do resolve their FQN. The package that the user asks may not be the same as the Service
    servicePackage.copy(pkg = "com.example.shoppingcart.domain")
  }
}

class ModelBuilderWithServiceAnnotationSuite extends ModelBuilderSuite(ModelBuilderSuite.ServiceAnnotationConfig) {
  override def derivePackageForEntity(servicePackage: PackageNaming, domainPackage: PackageNaming): PackageNaming = {
    // when using file annotation on a domain file,
    // the entity is considered to belong to the domain package
    domainPackage
  }
}
