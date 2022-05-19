/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen.js

import java.nio.file.Paths

class ViewServiceSourceGeneratorSuite extends munit.FunSuite {

  test("source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleViewService(protoRef)

    val protoSources = List(Paths.get("myentity1.proto"), Paths.get("someother.proto"))
    val protobufSourceDirectory = Paths.get("./src/proto")
    val sourceDirectory = Paths.get("./src/js")
    val generatedSourceDirectory = Paths.get("./lib/generated")

    val sourceDoc =
      ViewServiceSourceGenerator.source(
        protoSources,
        protobufSourceDirectory,
        sourceDirectory,
        generatedSourceDirectory,
        service)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { View } from "@kalix-io/kalix-javascript-sdk";
        |
        |/**
        | * Type definitions.
        | * These types have been generated based on your proto source.
        | * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
        | * 
        | * MyService; a strongly typed extension of View derived from your proto source
        | * @typedef { import("../../lib/generated/myservice").MyService } MyService
        | */
        |
        |/**
        | * @type MyService
        | */
        |const view = new View(
        |  [
        |    "myentity1.proto",
        |    "someother.proto"
        |  ],
        |  "com.example.service.MyService",
        |  {
        |    includeDirs: ["./src/proto"],
        |    viewId: "my-view-id"
        |  }
        |);
        |
        |view.setUpdateHandlers({
        |  Created(event, state, ctx) {
        |    throw new Error("The update handler for `Created` is not implemented, yet");
        |  },
        |  Updated(event, state, ctx) {
        |    throw new Error("The update handler for `Updated` is not implemented, yet");
        |  }
        |});
        |
        |export default view;
        |""".stripMargin)
  }
  test("source without transformations") {
    val protoRef = TestData.serviceProto()
    val service = TestData
      .simpleViewService(protoRef)
      .copy(transformedUpdates = List.empty)

    val protoSources = List(Paths.get("myentity1.proto"), Paths.get("someother.proto"))
    val protobufSourceDirectory = Paths.get("./src/proto")
    val sourceDirectory = Paths.get("./src/js")
    val generatedSourceDirectory = Paths.get("./lib/generated")

    val sourceDoc =
      ViewServiceSourceGenerator.source(
        protoSources,
        protobufSourceDirectory,
        sourceDirectory,
        generatedSourceDirectory,
        service)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { View } from "@kalix-io/kalix-javascript-sdk";
        |
        |/**
        | * Type definitions.
        | * These types have been generated based on your proto source.
        | * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
        | * 
        | * MyService; a strongly typed extension of View derived from your proto source
        | * @typedef { import("../../lib/generated/myservice").MyService } MyService
        | */
        |
        |/**
        | * @type MyService
        | */
        |const view = new View(
        |  [
        |    "myentity1.proto",
        |    "someother.proto"
        |  ],
        |  "com.example.service.MyService",
        |  {
        |    includeDirs: ["./src/proto"],
        |    viewId: "my-view-id"
        |  }
        |);
        |
        |export default view;
        |""".stripMargin)
  }

  test("typedef source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleViewService(protoRef)

    val sourceDoc =
      ViewServiceSourceGenerator.typedefSource(service)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code is managed by Kalix tooling.
        | * It will be re-generated to reflect any changes to your protobuf definitions.
        | * DO NOT EDIT
        | */
        |
        |import { View } from "@kalix-io/kalix-javascript-sdk";
        |import * as proto from "./proto";
        |
        |export declare namespace domain {
        |  type ViewState = proto.com.example.service.IViewState &
        |    protobuf.Message<proto.com.example.service.IViewState>;
        |  
        |  type EntityCreated = proto.com.example.service.persistence.IEntityCreated &
        |    protobuf.Message<proto.com.example.service.persistence.IEntityCreated>;
        |  
        |  type EntityUpdated = proto.com.example.service.persistence.IEntityUpdated &
        |    protobuf.Message<proto.com.example.service.persistence.IEntityUpdated>;
        |}
        |
        |export declare namespace MyService {
        |  type State = domain.ViewState;
        |  
        |  type Events =
        |    | domain.EntityCreated
        |    | domain.EntityUpdated;
        |  
        |  type UpdateHandlers = {
        |    Created: (
        |      event: domain.EntityCreated,
        |      state: State | undefined,
        |      ctx: View.UpdateHandlerContext
        |    ) => State;
        |    Updated: (
        |      event: domain.EntityUpdated,
        |      state: State | undefined,
        |      ctx: View.UpdateHandlerContext
        |    ) => State;
        |  };
        |}
        |
        |export declare type MyService = View<
        |  MyService.State,
        |  MyService.Events,
        |  MyService.UpdateHandlers
        |>;
        |""".stripMargin)
  }
}
