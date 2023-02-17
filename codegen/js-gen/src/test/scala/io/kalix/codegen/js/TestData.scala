/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen
package js

object TestData {
  def serviceProto(suffix: String = ""): PackageNaming =
    PackageNaming(
      s"MyService$suffix",
      "com.example.service",
      None,
      None,
      Some(s"ServiceOuterClass$suffix"),
      javaMultipleFiles = false)

  def domainProto(suffix: String = ""): PackageNaming =
    PackageNaming(
      s"Domain$suffix",
      "com.example.service.persistence",
      None,
      None,
      Some(s"EntityOuterClass$suffix"),
      javaMultipleFiles = false)

  val knownGoogleProto: PackageNaming =
    PackageNaming("EXT", "google.protobuf", None, None, None, javaMultipleFiles = true)

  def simpleEntityService(proto: PackageNaming = serviceProto(), suffix: String = ""): ModelBuilder.EntityService =
    ModelBuilder.EntityService(
      FullyQualifiedName(s"MyService$suffix", proto),
      List(
        ModelBuilder.Command(
          FullyQualifiedName("Set", proto),
          FullyQualifiedName("SetValue", proto),
          FullyQualifiedName("Empty", knownGoogleProto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("Get", proto),
          FullyQualifiedName("GetValue", proto),
          FullyQualifiedName("MyState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false)),
      s"com.example.Entity$suffix")

  def simpleViewService(proto: PackageNaming = serviceProto(), suffix: String = ""): ModelBuilder.ViewService =
    ModelBuilder.ViewService(
      FullyQualifiedName(s"MyService$suffix", proto),
      List(
        ModelBuilder.Command(
          FullyQualifiedName("Created", proto),
          FullyQualifiedName("EntityCreated", domainProto(suffix)),
          FullyQualifiedName("ViewState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("Updated", proto),
          FullyQualifiedName("EntityUpdated", domainProto(suffix)),
          FullyQualifiedName("ViewState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("MyQuery", proto),
          FullyQualifiedName("QueryRequest", proto),
          FullyQualifiedName("ViewState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false)),
      s"my-view-id$suffix",
      List(
        ModelBuilder.Command(
          FullyQualifiedName("Created", proto),
          FullyQualifiedName("EntityCreated", domainProto(suffix)),
          FullyQualifiedName("ViewState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("Updated", proto),
          FullyQualifiedName("EntityUpdated", domainProto(suffix)),
          FullyQualifiedName("ViewState", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false)),
      None)

  def simpleActionService(proto: PackageNaming = serviceProto(), suffix: String = ""): ModelBuilder.ActionService =
    ModelBuilder.ActionService(
      FullyQualifiedName(s"MyService$suffix", proto),
      List(
        ModelBuilder.Command(
          FullyQualifiedName("Simple", proto),
          FullyQualifiedName("Request", domainProto(suffix)),
          FullyQualifiedName("Response", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("StreamedIn", proto),
          FullyQualifiedName("Request", domainProto(suffix)),
          FullyQualifiedName("Response", proto),
          streamedInput = true,
          streamedOutput = false,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("StreamedOut", proto),
          FullyQualifiedName("Request", domainProto(suffix)),
          FullyQualifiedName("Response", proto),
          streamedInput = false,
          streamedOutput = true,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("FullyStreamed", proto),
          FullyQualifiedName("Request", domainProto(suffix)),
          FullyQualifiedName("Response", proto),
          streamedInput = true,
          streamedOutput = true,
          ignore = false),
        ModelBuilder.Command(
          FullyQualifiedName("IgnoredEventHandler", proto),
          FullyQualifiedName("Request", domainProto(suffix)),
          FullyQualifiedName("Response", proto),
          streamedInput = false,
          streamedOutput = false,
          ignore = true)),
      None)

  def eventSourcedEntity(suffix: String = ""): ModelBuilder.EventSourcedEntity =
    ModelBuilder.EventSourcedEntity(
      FullyQualifiedName(s"MyEntity$suffix", domainProto(suffix)),
      entityType = s"my-eventsourcedentity$suffix-persistence",
      ModelBuilder.State(FullyQualifiedName("MyState", domainProto(suffix))),
      List(
        ModelBuilder.Event(FullyQualifiedName("EventOne", domainProto(suffix))),
        ModelBuilder.Event(FullyQualifiedName("EventTwo", domainProto(suffix)))))

  def valueEntity(suffix: String = ""): ModelBuilder.ValueEntity =
    ModelBuilder.ValueEntity(
      FullyQualifiedName(s"MyValueEntity$suffix", domainProto(suffix)),
      entityType = s"my-valueentity$suffix-persistence",
      ModelBuilder.State(FullyQualifiedName("MyState", domainProto(suffix))))
}
