/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen
package js

import com.google.common.base.Charsets
import org.bitbucket.inkytonik.kiama.output.PrettyPrinterTypes.Document

import java.nio.file.{ Files, Path }

/**
 * Responsible for generating JavaScript source from view service model
 */
object ActionServiceSourceGenerator {

  import SourceGenerator._

  private val ProtoExt = ".proto"

  private val ProtoNs = "proto"

  def generate(
      service: ModelBuilder.ActionService,
      protobufSourceDirectory: Path,
      sourceDirectory: Path,
      testSourceDirectory: Path,
      generatedSourceDirectory: Path,
      integrationTestSourceDirectory: Option[Path],
      indexFilename: String,
      allProtoSources: Iterable[Path]) = {

    val serviceFilename = service.fqn.name.toLowerCase + ".js"
    val sourcePath = sourceDirectory.resolve(serviceFilename)

    val typedefFilename = service.fqn.name.toLowerCase + ".d.ts"
    val typedefSourcePath = generatedSourceDirectory.resolve(typedefFilename)
    val _ = typedefSourcePath.getParent.toFile.mkdirs()
    val _ = Files.write(typedefSourcePath, typedefSource(service).layout.getBytes(Charsets.UTF_8))

    if (!sourcePath.toFile.exists()) {
      // Now we generate the entity
      val _ = sourcePath.getParent.toFile.mkdirs()
      val _ = Files.write(
        sourcePath,
        source(allProtoSources, protobufSourceDirectory, sourceDirectory, generatedSourceDirectory, service).layout
          .getBytes(Charsets.UTF_8))
      List(sourcePath, typedefSourcePath)
    } else {
      List(typedefSourcePath)
    }
  }

  private[codegen] def source(
      protoSources: Iterable[Path],
      protobufSourceDirectory: Path,
      sourceDirectory: Path,
      generatedSourceDirectory: Path,
      service: ModelBuilder.ActionService): Document = {
    val typedefPath =
      sourceDirectory.toAbsolutePath
        .relativize(generatedSourceDirectory.toAbsolutePath)
        .resolve(service.fqn.name.toLowerCase())
        .toString

    pretty(
      initialisedCodeComment <> line <> line <>
      "import" <+> braces(" Action ") <+> "from" <+> dquotes("@kalix-io/sdk") <> semi <> line <>
      line <>
      blockComment(Seq[Doc](
        "Type definitions.",
        "These types have been generated based on your proto source.",
        "A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.",
        emptyDoc,
        service.fqn.name <> semi <+> "a strongly typed extension of Action derived from your proto source",
        typedef("import" <> parens(dquotes(typedefPath)) <> dot <> service.fqn.name, service.fqn.name)): _*) <> line <>
      line <>
      blockComment("@type" <+> service.fqn.name) <> line <>
      "const action" <+> equal <+> "new" <+> "Action" <> parens(
        nest(
          line <>
          brackets(nest(line <>
          ssep(protoSources.map(p => dquotes(p.toString)).toList, comma <> line)) <> line) <> comma <> line <>
          dquotes(service.fqn.fullName) <> comma <> line <>
          braces(nest(line <>
          ssep(
            if (sourceDirectory != protobufSourceDirectory)
              List("includeDirs" <> colon <+> brackets(dquotes(protobufSourceDirectory.toString)))
            else List.empty,
            comma <> line)) <> line)) <> line) <> semi <> line <>
      line <>
      "action.commandHandlers" <+> equal <+> braces(
        nest(line <>
        ssep(
          service.commands.toSeq.map { command =>
            command.fqn.name <> parens(if (command.streamedInput) "ctx" else "request, ctx") <+> braces(nest(line <>
            "throw new Error" <> parens(
              dquotes("The command handler for `" <> command.fqn.name <> "` is not implemented, yet")) <> semi) <> line)
          },
          comma <> line)) <> line) <> semi <> line <>
      line <>
      "export default action;" <> line)
  }

  private[codegen] def typedefSource(service: ModelBuilder.ActionService): Document =
    pretty(
      managedCodeComment <> line <> line <>
      "import" <+> braces(space <> "Action, CommandReply" <> space) <+> "from" <+> dquotes(
        "@kalix-io/sdk") <> semi <> line <>
      "import * as" <+> ProtoNs <+> "from" <+> dquotes("./proto") <> semi <> line <>
      line <>
      apiTypes(service) <>
      line <>
      "export declare namespace" <+> service.fqn.name <+> braces(
        nest(line <>
        "type CommandHandlers" <+> equal <+> braces(nest(line <>
        ssep(
          service.commands.toSeq.map { command =>
            command.fqn.name <> colon <+> parens(nest(line <>
            (if (command.streamedInput) emptyDoc
             else {
               "command" <> colon <+> apiClass(command.inputType) <> comma <> line
             }) <>
            "ctx" <> colon <+> (
              if (command.streamedInput && command.streamedOutput)
                "Action.StreamedCommandContext" <> angles(
                  apiClass(command.inputType) <> comma <+> apiInterface(command.outputType))
              else if (command.streamedInput)
                "Action.StreamedInCommandContext" <> angles(
                  apiClass(command.inputType) <> comma <+> apiInterface(command.outputType))
              else if (command.streamedOutput)
                "Action.StreamedOutCommandContext" <> angles(apiInterface(command.outputType))
              else "Action.UnaryCommandContext" <> angles(apiInterface(command.outputType))
            ) <> line)) <+> "=>" <+>
            ssep(
              if (command.streamedOutput) Seq(text("void"))
              else
                Seq(
                  "CommandReply" <> angles(apiInterface(command.outputType)),
                  "Promise" <> angles("CommandReply" <> angles(apiInterface(command.outputType)))),
              " | ") <> semi
          },
          line)) <> line) <> semi) <> line) <> line <>
      line <>
      "export declare type" <+> service.fqn.name <+> equal <+>
      "Action" <> angles(s"${service.fqn.name}.CommandHandlers") <> semi <> line)
}
