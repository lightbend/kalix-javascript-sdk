/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen.js

import java.nio.file.Paths

class EntityServiceSourceGeneratorSuite extends munit.FunSuite {

  test("EventSourcedEntity source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef)
    val entity = TestData.eventSourcedEntity()

    val protoSources = List(Paths.get("myentity1.proto"), Paths.get("someother.proto"))
    val protobufSourceDirectory = Paths.get("./src/proto")
    val sourceDirectory = Paths.get("./src/js")
    val generatedSourceDirectory = Paths.get("./lib/generated")

    val sourceDoc =
      EntityServiceSourceGenerator.source(
        protoSources,
        protobufSourceDirectory,
        sourceDirectory,
        generatedSourceDirectory,
        service,
        entity)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { EventSourcedEntity, Reply } from "@kalix-io/kalix-javascript-sdk";
        |
        |/**
        | * Type definitions.
        | * These types have been generated based on your proto source.
        | * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
        | * 
        | * MyService; a strongly typed extension of EventSourcedEntity derived from your proto source
        | * @typedef { import("../../lib/generated/myentity").MyService } MyService
        | */
        |
        |/**
        | * @type MyService
        | */
        |const entity = new EventSourcedEntity(
        |  [
        |    "myentity1.proto",
        |    "someother.proto"
        |  ],
        |  "com.example.service.MyService",
        |  "my-eventsourcedentity-persistence",
        |  {
        |    includeDirs: ["./src/proto"]
        |  }
        |);
        |
        |const MyState = entity.lookupType("com.example.service.persistence.MyState");
        |
        |entity.setInitial(entityId => MyState.create({}));
        |
        |entity.setBehavior(state => ({
        |  commandHandlers: {
        |    Set(command, state, ctx) {
        |      return Reply.failure("The command handler for `Set` is not implemented, yet");
        |    },
        |    Get(command, state, ctx) {
        |      return Reply.failure("The command handler for `Get` is not implemented, yet");
        |    }
        |  },
        |  
        |  eventHandlers: {
        |    SetEvent(event, state) {
        |      return state;
        |    }
        |  }
        |}));
        |
        |export default entity;
        |""".stripMargin)
  }

  test("ValueEntity source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef)
    val entity = TestData.valueEntity()

    val protoSources = List(Paths.get("myentity1.proto"), Paths.get("someother.proto"))
    val protobufSourceDirectory = Paths.get("./src/proto")
    val sourceDirectory = Paths.get("./src/js")
    val generatedSourceDirectory = Paths.get("./lib/generated")

    val sourceDoc =
      EntityServiceSourceGenerator.source(
        protoSources,
        protobufSourceDirectory,
        sourceDirectory,
        generatedSourceDirectory,
        service,
        entity)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { ValueEntity, Reply } from "@kalix-io/kalix-javascript-sdk";
        |
        |/**
        | * Type definitions.
        | * These types have been generated based on your proto source.
        | * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
        | * 
        | * MyService; a strongly typed extension of ValueEntity derived from your proto source
        | * @typedef { import("../../lib/generated/myvalueentity").MyService } MyService
        | */
        |
        |/**
        | * @type MyService
        | */
        |const entity = new ValueEntity(
        |  [
        |    "myentity1.proto",
        |    "someother.proto"
        |  ],
        |  "com.example.service.MyService",
        |  "my-valueentity-persistence",
        |  {
        |    includeDirs: ["./src/proto"]
        |  }
        |);
        |
        |const MyState = entity.lookupType("com.example.service.persistence.MyState");
        |
        |entity.setInitial(entityId => MyState.create({}));
        |
        |entity.setCommandHandlers({
        |  Set(command, state, ctx) {
        |    return Reply.failure("The command handler for `Set` is not implemented, yet");
        |  },
        |  Get(command, state, ctx) {
        |    return Reply.failure("The command handler for `Get` is not implemented, yet");
        |  }
        |});
        |
        |export default entity;
        |""".stripMargin)
  }

  test("EventSourcedEntity typedef source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef)
    val entity = TestData.eventSourcedEntity()

    val sourceDoc =
      EntityServiceSourceGenerator.typedefSource(service, entity)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code is managed by Kalix tooling.
        | * It will be re-generated to reflect any changes to your protobuf definitions.
        | * DO NOT EDIT
        | */
        |
        |import { EventSourcedEntity , CommandReply } from "@kalix-io/kalix-javascript-sdk";
        |import * as proto from "./proto";
        |
        |export declare namespace api {
        |  type SetValue = proto.com.example.service.SetValue;
        |  type GetValue = proto.com.example.service.GetValue;
        |  type IEmpty = proto.google.protobuf.IEmpty;
        |  type IMyState = proto.com.example.service.IMyState;
        |}
        |
        |export declare namespace domain {
        |  type MyState = proto.com.example.service.persistence.IMyState &
        |    protobuf.Message<proto.com.example.service.persistence.IMyState>;
        |  
        |  type SetEvent = proto.com.example.service.persistence.ISetEvent &
        |    protobuf.Message<proto.com.example.service.persistence.ISetEvent>;
        |}
        |
        |export declare namespace MyService {
        |  type State = domain.MyState;
        |  
        |  type Events = domain.SetEvent;
        |  
        |  type EventHandlers = {
        |    SetEvent: (
        |      event: domain.SetEvent,
        |      state: State
        |    ) => State;
        |  };
        |  
        |  type CommandContext = EventSourcedEntity.CommandContext<Events>;
        |  
        |  type CommandHandlers = {
        |    Set: (
        |      command: api.SetValue,
        |      state: State,
        |      ctx: CommandContext
        |    ) => CommandReply<api.IEmpty>;
        |    Get: (
        |      command: api.GetValue,
        |      state: State,
        |      ctx: CommandContext
        |    ) => CommandReply<api.IMyState>;
        |  };
        |}
        |
        |export declare type MyService = EventSourcedEntity<
        |  MyService.State,
        |  MyService.Events,
        |  MyService.CommandHandlers,
        |  MyService.EventHandlers
        |>;
        |""".stripMargin)
  }

  test("ValueEntity typedef source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef)
    val entity = TestData.valueEntity()

    val sourceDoc =
      EntityServiceSourceGenerator.typedefSource(service, entity)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code is managed by Kalix tooling.
        | * It will be re-generated to reflect any changes to your protobuf definitions.
        | * DO NOT EDIT
        | */
        |
        |import { ValueEntity , CommandReply } from "@kalix-io/kalix-javascript-sdk";
        |import * as proto from "./proto";
        |
        |export declare namespace api {
        |  type SetValue = proto.com.example.service.SetValue;
        |  type GetValue = proto.com.example.service.GetValue;
        |  type IEmpty = proto.google.protobuf.IEmpty;
        |  type IMyState = proto.com.example.service.IMyState;
        |}
        |
        |export declare namespace domain {
        |  type MyState = proto.com.example.service.persistence.IMyState &
        |    protobuf.Message<proto.com.example.service.persistence.IMyState>;
        |}
        |
        |export declare namespace MyService {
        |  type State = domain.MyState;
        |  
        |  type CommandContext = ValueEntity.CommandContext<State>;
        |  
        |  type CommandHandlers = {
        |    Set: (
        |      command: api.SetValue,
        |      state: State,
        |      ctx: CommandContext
        |    ) => CommandReply<api.IEmpty>;
        |    Get: (
        |      command: api.GetValue,
        |      state: State,
        |      ctx: CommandContext
        |    ) => CommandReply<api.IMyState>;
        |  };
        |}
        |
        |export declare type MyService = ValueEntity<
        |  MyService.State,
        |  MyService.CommandHandlers
        |>;
        |""".stripMargin)
  }

  test("EventSourcedEntity test source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef, "1")
    val entity = TestData.eventSourcedEntity()

    val testSourceDirectory = Paths.get("./test/js")
    val sourceDirectory = Paths.get("./src/js")
    val sourceDoc =
      EntityServiceSourceGenerator.testSource(service, entity, testSourceDirectory, sourceDirectory)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { MockEventSourcedEntity } from "@kalix-io/testkit";
        |import { expect } from "chai";
        |import myentity from "../../src/js/myentity.js";
        |
        |describe("MyService1", () => {
        |  const entityId = "entityId";
        |  
        |  describe("Set", () => {
        |    it("should...", () => {
        |      const entity = new MockEventSourcedEntity(myentity, entityId);
        |      // TODO: you may want to set fields in addition to the entity id
        |      // const result = entity.handleCommand("Set", { entityId });
        |      
        |      // expect(result).to.deep.equal({});
        |      // expect(entity.error).to.be.undefined;
        |      // expect(entity.state).to.deep.equal({});
        |      // expect(entity.events).to.deep.equal([]);
        |    });
        |  });
        |  
        |  describe("Get", () => {
        |    it("should...", () => {
        |      const entity = new MockEventSourcedEntity(myentity, entityId);
        |      // TODO: you may want to set fields in addition to the entity id
        |      // const result = entity.handleCommand("Get", { entityId });
        |      
        |      // expect(result).to.deep.equal({});
        |      // expect(entity.error).to.be.undefined;
        |      // expect(entity.state).to.deep.equal({});
        |      // expect(entity.events).to.deep.equal([]);
        |    });
        |  });
        |});""".stripMargin)
  }

  test("ValueEntity test source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef, "1")
    val entity = TestData.valueEntity()

    val testSourceDirectory = Paths.get("./test/js")
    val sourceDirectory = Paths.get("./src/js")
    val sourceDoc =
      EntityServiceSourceGenerator.testSource(service, entity, testSourceDirectory, sourceDirectory)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { MockValueEntity } from "@kalix-io/testkit";
        |import { expect } from "chai";
        |import myvalueentity from "../../src/js/myvalueentity.js";
        |
        |describe("MyService1", () => {
        |  const entityId = "entityId";
        |  
        |  describe("Set", () => {
        |    it("should...", () => {
        |      const entity = new MockValueEntity(myvalueentity, entityId);
        |      // TODO: you may want to set fields in addition to the entity id
        |      // const result = entity.handleCommand("Set", { entityId });
        |      
        |      // expect(result).to.deep.equal({});
        |      // expect(entity.error).to.be.undefined;
        |      // expect(entity.state).to.deep.equal({});
        |    });
        |  });
        |  
        |  describe("Get", () => {
        |    it("should...", () => {
        |      const entity = new MockValueEntity(myvalueentity, entityId);
        |      // TODO: you may want to set fields in addition to the entity id
        |      // const result = entity.handleCommand("Get", { entityId });
        |      
        |      // expect(result).to.deep.equal({});
        |      // expect(entity.error).to.be.undefined;
        |      // expect(entity.state).to.deep.equal({});
        |    });
        |  });
        |});""".stripMargin)
  }

  test("ValueEntity integration test source") {
    val protoRef = TestData.serviceProto()
    val service = TestData.simpleEntityService(protoRef, "1")
    val entity = TestData.valueEntity()

    val testSourceDirectory = Paths.get("./test/js")
    val sourceDirectory = Paths.get("./src/js")
    val sourceDoc =
      EntityServiceSourceGenerator.integrationTestSource(service, entity, testSourceDirectory, sourceDirectory)
    assertEquals(
      sourceDoc.layout.replace("\\", "/"), // Cope with windows testing
      """/* This code was initialised by Kalix tooling.
        | * As long as this file exists it will not be re-generated.
        | * You are free to make changes to this file.
        | */
        |
        |import { IntegrationTestkit } from "@kalix-io/testkit";
        |import { expect } from "chai";
        |import myvalueentity from "../../src/js/myvalueentity.js";
        |
        |const testkit = new IntegrationTestkit();
        |testkit.addComponent(myvalueentity);
        |
        |const client = () => testkit.clients.MyService1;
        |
        |describe("MyService1", function() {
        |  this.timeout(60000);
        |  
        |  before(done => testkit.start(done));
        |  after(done => testkit.shutdown(done));
        |  
        |  describe("Set", () => {
        |    it("should...", async () => {
        |      // TODO: populate command payload, and provide assertions to match replies
        |      // const result = await client().set({});
        |    });
        |  });
        |  describe("Get", () => {
        |    it("should...", async () => {
        |      // TODO: populate command payload, and provide assertions to match replies
        |      // const result = await client().get({});
        |    });
        |  });
        |});""".stripMargin)
  }

}
