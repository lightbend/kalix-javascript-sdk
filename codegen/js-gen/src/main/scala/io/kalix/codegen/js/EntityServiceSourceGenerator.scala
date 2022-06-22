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
 * Responsible for generating JavaScript source from an entity model
 */
object EntityServiceSourceGenerator {

  import SourceGenerator._

  private val ProtoExt = ".proto"

  private val ProtoNs = "proto"

  def generate(
      entity: ModelBuilder.Entity,
      service: ModelBuilder.EntityService,
      protobufSourceDirectory: Path,
      sourceDirectory: Path,
      testSourceDirectory: Path,
      generatedSourceDirectory: Path,
      integrationTestSourceDirectory: Option[Path],
      allProtoSources: Iterable[Path],
      typescript: Boolean) = {

    val fileExtension = if (typescript) ".ts" else ".js"
    val entityFilename = entity.fqn.name.toLowerCase + fileExtension
    val sourcePath = sourceDirectory.resolve(entityFilename)

    val typedefFilename = entity.fqn.name.toLowerCase + ".d.ts"
    val typedefSourcePath = generatedSourceDirectory.resolve(typedefFilename)
    val _ = typedefSourcePath.getParent.toFile.mkdirs()
    val _ = Files.write(typedefSourcePath, typedefSource(service, entity).layout.getBytes(Charsets.UTF_8))

    // We're going to generate an entity - let's see if we can generate its test...
    val entityTestFilename = entityFilename.replace(fileExtension, ".test" + fileExtension)
    val testSourcePath =
      testSourceDirectory.resolve(entityTestFilename)
    val testSourceFiles = if (!testSourcePath.toFile.exists()) {
      val _ = testSourcePath.getParent.toFile.mkdirs()
      val _ = Files.write(
        testSourcePath,
        testSource(service, entity, testSourceDirectory, sourceDirectory, typescript).layout.getBytes(Charsets.UTF_8))
      List(testSourcePath)
    } else {
      List.empty
    }

    // Next, if an integration test directory is configured, we generate integration tests...
    val integrationTestSourceFiles = integrationTestSourceDirectory
      .map(_.resolve(entityTestFilename))
      .filterNot(_.toFile.exists())
      .map { integrationTestSourcePath =>
        val _ = integrationTestSourcePath.getParent.toFile.mkdirs()
        val _ = Files.write(
          integrationTestSourcePath,
          integrationTestSource(service, entity, testSourceDirectory, sourceDirectory, typescript).layout
            .getBytes(Charsets.UTF_8))
        integrationTestSourcePath
      }

    val sourceFiles = if (!sourcePath.toFile.exists()) {
      // Now we generate the entity
      val _ = sourcePath.getParent.toFile.mkdirs()
      val _ = Files.write(
        sourcePath,
        source(
          allProtoSources,
          protobufSourceDirectory,
          sourceDirectory,
          generatedSourceDirectory,
          service,
          entity,
          typescript).layout
          .getBytes(Charsets.UTF_8))
      List(sourcePath, typedefSourcePath)
    } else {
      List(typedefSourcePath)
    }

    sourceFiles ++ testSourceFiles ++ integrationTestSourceFiles
  }

  private[codegen] def source(
      protoSources: Iterable[Path],
      protobufSourceDirectory: Path,
      sourceDirectory: Path,
      generatedSourceDirectory: Path,
      service: ModelBuilder.Service,
      entity: ModelBuilder.Entity,
      typescript: Boolean): Document = {
    val typedefPath =
      sourceDirectory.toAbsolutePath
        .relativize(generatedSourceDirectory.toAbsolutePath)
        .resolve(entity.fqn.name.toLowerCase())
        .toString

    val entityType = entity match {
      case _: ModelBuilder.EventSourcedEntity => "EventSourcedEntity"
      case _: ModelBuilder.ValueEntity        => "ValueEntity"
    }
    pretty(
      initialisedCodeComment <> line <> line <>
      "import" <+> braces(space <> entityType <> comma <+> "Reply" <> space) <+> "from" <+> dquotes(
        "@kalix-io/kalix-javascript-sdk") <> semi <> line <>
      (if (typescript) {
         "import" <+> braces(space <> service.fqn.name <> space) <+> "from" <+> dquotes(typedefPath) <> semi <> line <>
         line <>
         "const entity: " <> service.fqn.name
       } else {
         line <>
         blockComment(Seq[Doc](
           "Type definitions.",
           "These types have been generated based on your proto source.",
           "A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.",
           emptyDoc) ++ Seq[Doc](
           service.fqn.name <> semi <+> "a strongly typed extension of" <+> entityType <+> "derived from your proto source",
           typedef(
             "import" <> parens(dquotes(typedefPath)) <> dot <> service.fqn.name,
             service.fqn.name)): _*) <> line <>
         line <>
         blockComment("@type" <+> service.fqn.name) <> line <>
         "const entity"
       }) <+> equal <+> "new" <+> entityType <> parens(
        nest(
          line <>
          brackets(nest(line <>
          ssep(protoSources.map(p => dquotes(p.toString)).toList, comma <> line)) <> line) <> comma <> line <>
          dquotes(service.fqn.fullName) <> comma <> line <>
          dquotes(entity.entityType) <> comma <> line <>
          braces(nest(line <>
          ssep(
            if (sourceDirectory != protobufSourceDirectory)
              List("includeDirs" <> colon <+> brackets(dquotes(protobufSourceDirectory.toString)))
            else List.empty,
            comma <> line)) <> line)) <> line) <> semi <> line <>
      line <>
      "const" <+> entity.state.fqn.name <+> equal <+> "entity.lookupType" <> parens(
        dquotes(entity.state.fqn.fullName)) <> semi <> line <>
      line <>
      "entity.setInitial" <> parens(
        "entityId => " <> entity.state.fqn.name <> ".create" <> parens("{}")) <> semi <> line <>
      line <>
      (entity match {
        case ModelBuilder.EventSourcedEntity(_, _, _, events) =>
          "entity.setBehavior" <> parens(
            "state => " <> parens(
              braces(nest(line <>
              "commandHandlers" <> colon <+> braces(nest(line <>
              ssep(
                service.commands.toSeq.map { command =>
                  command.fqn.name <> parens("command, state, ctx") <+> braces(nest(line <>
                  "return Reply.failure(\"The command handler for `" <> command.fqn.name <> "` is not implemented, yet\")" <> semi) <> line)
                },
                comma <> line)) <> line) <> comma <>
              line <>
              line <>
              "eventHandlers" <> colon <+> braces(nest(line <>
              ssep(
                events.toSeq.map { event =>
                  event.fqn.name <> parens("event, state") <+> braces(nest(line <>
                  "return state") <> semi <> line)
                },
                comma)) <> line)) <> line))) <> semi
        case _: ModelBuilder.ValueEntity =>
          "entity.setCommandHandlers" <> parens(
            braces(nest(line <>
            ssep(
              service.commands.toSeq.map { command =>
                command.fqn.name <> parens("command, state, ctx") <+> braces(nest(line <>
                "return Reply.failure(\"The command handler for `" <> command.fqn.name <> "` is not implemented, yet\")" <> semi) <> line)
              },
              comma <> line)) <> line)) <> semi
      }) <> line <>
      line <>
      "export default entity;" <> line)
  }

  private[codegen] def typedefSource(service: ModelBuilder.Service, entity: ModelBuilder.Entity): Document =
    pretty(
      managedCodeComment <> line <> line <>
      "import" <+> braces(space <> (entity match {
        case _: ModelBuilder.EventSourcedEntity => "EventSourcedEntity"
        case _: ModelBuilder.ValueEntity        => "ValueEntity"
      }) <+> comma <+> "CommandReply" <> space) <+> "from" <+> dquotes(
        "@kalix-io/kalix-javascript-sdk") <> semi <> line <>
      "import * as" <+> ProtoNs <+> "from" <+> dquotes("./proto") <> semi <> line <>
      line <>
      apiTypes(service) <>
      line <>
      domainTypes(entity) <>
      line <>
      "export declare namespace" <+> service.fqn.name <+> braces(
        nest(
          line <>
          "type" <+> "State" <+> equal <+> domainType(entity.state.fqn) <> semi <> line <>
          line <>
          (entity match {
            case ModelBuilder.EventSourcedEntity(_, _, _, events) =>
              "type Events" <+> equal <> typeUnion(events.toSeq.map(event => domainType(event.fqn))) <> semi <> line <>
                line <>
                "type EventHandlers" <+> equal <+> braces(nest(line <>
                ssep(
                  events.toSeq.map { event =>
                    event.fqn.name <> colon <+> parens(nest(line <>
                    "event" <> colon <+> domainType(event.fqn) <> comma <> line <>
                    "state" <> colon <+> "State") <> line) <+> "=>" <+> "State" <> semi
                  },
                  line)) <> line) <> semi <> line <> line
            case _: ModelBuilder.ValueEntity => emptyDoc
          }) <>
          "type CommandContext" <+> equal <+> (entity match {
            case _: ModelBuilder.EventSourcedEntity => "EventSourcedEntity.CommandContext<Events>"
            case _: ModelBuilder.ValueEntity        => "ValueEntity.CommandContext<State>"
          }) <> semi <> line <>
          line <>
          "type CommandHandlers" <+> equal <+> braces(nest(line <>
          ssep(
            service.commands.toSeq.map { command =>
              command.fqn.name <> colon <+> parens(nest(line <>
              "command" <> colon <+> apiClass(command.inputType) <> comma <> line <>
              "state" <> colon <+> "State" <> comma <> line <>
              "ctx" <> colon <+> "CommandContext") <> line) <+> "=>" <+> ssep(
                Seq(
                  "CommandReply" <> angles(apiInterface(command.outputType)),
                  "Promise" <> angles("CommandReply" <> angles(apiInterface(command.outputType)))),
                " | ") <> semi
            },
            line)) <> line) <> semi) <> line) <> line <>
      line <>
      "export declare type" <+> service.fqn.name <+> equal <+> (entity match {
        case _: ModelBuilder.EventSourcedEntity =>
          "EventSourcedEntity" <> angles(
            nest(line <>
            ssep(
              Seq(
                s"${service.fqn.name}.State",
                s"${service.fqn.name}.Events",
                s"${service.fqn.name}.CommandHandlers",
                s"${service.fqn.name}.EventHandlers"),
              comma <> line)) <> line)
        case _: ModelBuilder.ValueEntity =>
          "ValueEntity" <> angles(nest(line <>
          ssep(Seq(s"${service.fqn.name}.State", s"${service.fqn.name}.CommandHandlers"), comma <> line)) <> line)
      }) <> semi <> line)

  private[codegen] def domainTypes(entity: ModelBuilder.Entity): Doc = {
    "export declare namespace domain" <+> braces(
      nest(line <>
      "type" <+> entity.state.fqn.name <+> equal <+> messageType(entity.state.fqn) <> semi <>
      (entity match {
        case ModelBuilder.EventSourcedEntity(_, _, _, events) =>
          line <>
            ssep(
              events.toSeq.map(event => line <> "type" <+> event.fqn.name <+> equal <+> messageType(event.fqn) <> semi),
              line)
        case _: ModelBuilder.ValueEntity => emptyDoc
      })) <> line) <> line
  }

  private[codegen] def testSource(
      service: ModelBuilder.Service,
      entity: ModelBuilder.Entity,
      testSourceDirectory: Path,
      sourceDirectory: Path,
      typescript: Boolean): Document = {

    val entityName = entity.fqn.name.toLowerCase
    val entityImport = if (typescript) entityName else s"$entityName.js"

    val entityMockType = entity match {
      case _: ModelBuilder.EventSourcedEntity => "MockEventSourcedEntity"
      case _: ModelBuilder.ValueEntity        => "MockValueEntity"
    }

    pretty(
      initialisedCodeComment <> line <> line <>
      "import" <+> braces(" " <> entityMockType <> " ") <+> "from" <+> dquotes("@kalix-io/testkit") <> semi <> line <>
      """import { expect } from "chai"""" <> semi <> line <>
      "import" <+> entityName <+> "from" <+> dquotes(
        testSourceDirectory.toAbsolutePath
          .relativize(sourceDirectory.toAbsolutePath)
          .resolve(entityImport)
          .toString) <> semi <> line <>
      line <>

      "describe" <> parens(dquotes(service.fqn.name) <> comma <+> arrowFn(
        List.empty,
        "const" <+> "entityId" <+> equal <+> dquotes("entityId") <> semi <> line <>
        line <>
        ssep(
          service.commands.map { command =>
            "describe" <> parens(dquotes(command.fqn.name) <> comma <+> arrowFn(
              List.empty,
              "it" <> parens(dquotes("should...") <> comma <+> "async" <+> arrowFn(
                List.empty,
                "const entity" <+> equal <+> "new" <+> entityMockType <> parens(
                  entityName <> comma <+> "entityId") <> semi <> line <>
                "// TODO: you may want to set fields in addition to the entity id" <> line <>
                "// const result" <+> equal <+> "await" <+> "entity.handleCommand" <> parens(
                  dquotes(command.fqn.name) <> comma <+> braces(" entityId ")) <> semi <> line <>
                line <>
                "// expect" <> parens("result") <> dot <> "to" <> dot <> "deep" <> dot <> "equal" <> parens(
                  braces("")) <> semi <> line <>
                "// expect" <> parens(
                  "entity.error") <> dot <> "to" <> dot <> "be" <> dot <> "undefined" <> semi <> line <>
                "// expect" <> parens("entity.state") <> dot <> "to" <> dot <> "deep" <> dot <> "equal" <> parens(
                  braces("")) <> semi <>
                (entity match {
                  case _: ModelBuilder.EventSourcedEntity =>
                    line <>
                      "// expect" <> parens(
                        "entity.events") <> dot <> "to" <> dot <> "deep" <> dot <> "equal" <> parens("[]") <> semi
                  case _ => emptyDoc
                }))) <> semi)) <> semi
          }.toSeq,
          line <> line))) <> semi)
  }

  private[codegen] def integrationTestSource(
      service: ModelBuilder.Service,
      entity: ModelBuilder.Entity,
      testSourceDirectory: Path,
      sourceDirectory: Path,
      typescript: Boolean): Document = {

    val entityName = entity.fqn.name.toLowerCase
    val entityImport = if (typescript) entityName else s"$entityName.js"

    pretty(
      initialisedCodeComment <> line <> line <>
      "import" <+> braces(" IntegrationTestkit ") <+> "from" <+> dquotes("@kalix-io/testkit") <> semi <> line <>
      """import { expect } from "chai"""" <> semi <> line <>
      "import" <+> entityName <+> "from" <+> dquotes(testSourceDirectory.toAbsolutePath
        .relativize(sourceDirectory.toAbsolutePath)
        .resolve(entityImport)
        .toString) <> semi <> line <>
      line <>
      "const" <+> "testkit" <+> equal <+> "new" <+> "IntegrationTestkit" <> parens(emptyDoc) <> semi <> line <>
      "testkit" <> dot <> "addComponent" <> parens(entityName) <> semi <> line <>
      line <>
      "const" <+> "client" <+> equal <+> parens(
        emptyDoc) <+> "=>" <+> "testkit.clients" <> dot <> service.fqn.name <> semi <> line <>
      line <>
      "describe" <> parens(
        dquotes(service.fqn.name) <> comma <+> "function" <> parens(emptyDoc) <+> braces(
          nest(
            line <>
            "this.timeout" <> parens("60000") <> semi <> line <>
            line <>
            "before" <> parens("done" <+> "=>" <+> "testkit.start" <> parens("done")) <> semi <> line <>
            "after" <> parens("done" <+> "=>" <+> "testkit.shutdown" <> parens("done")) <> semi <> line <>
            line <>
            ssep(
              service.commands.map { command =>
                "describe" <> parens(dquotes(command.fqn.name) <> comma <+> arrowFn(
                  List.empty,
                  "it" <> parens(dquotes("should...") <> comma <+> "async" <+> arrowFn(
                    List.empty,
                    "// TODO: populate command payload, and provide assertions to match replies" <> line <>
                    "//" <+> "const" <+> "result" <+> equal <+> "await" <+> "client" <> parens(
                      emptyDoc) <> dot <> lowerFirst(command.fqn.name) <> parens(
                      braces(emptyDoc)) <> semi)) <> semi)) <> semi
              }.toSeq,
              line)) <> line)) <> semi)
  }
}
