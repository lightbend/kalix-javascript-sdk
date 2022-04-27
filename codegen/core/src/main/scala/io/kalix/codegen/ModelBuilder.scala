/*
 * Copyright (c) Lightbend Inc. 2021
 *
 */

package io.kalix.codegen

import scala.jdk.CollectionConverters._

import kalix.CodegenOptions
import kalix.EventSourcedEntityDef
import com.google.protobuf.Descriptors
import kalix.ServiceOptions.ServiceType
import kalix.ValueEntityDef
import com.google.protobuf.Descriptors.ServiceDescriptor

/**
 * Builds a model of entities and their properties from a protobuf descriptor
 */
object ModelBuilder {

  object Model {
    def empty: Model = Model(Map.empty, Map.empty)

    def fromService(service: Service): Model =
      Model.empty.addService(service)

    def fromEntity(entity: Entity): Model =
      Model.empty.addEntity(entity)
  }

  /**
   * The Kalix service definitions and entities that could be extracted from a protobuf descriptor
   */
  case class Model(services: Map[String, Service], entities: Map[String, Entity]) {

    def addService(service: Service): Model =
      copy(services + (service.fqn.fullName -> service), entities)

    def addEntity(entity: Entity): Model =
      copy(services, entities + (entity.fqn.fullName -> entity))

    def ++(model: Model): Model =
      Model(services ++ model.services, entities ++ model.entities)
  }

  /**
   * An entity represents the primary model object and is conceptually equivalent to a class, or a type of state.
   */
  sealed abstract class Entity(val fqn: FullyQualifiedName, val entityType: String)

  /**
   * A type of Entity that stores its state using a journal of events, and restores its state by replaying that journal.
   */
  case class EventSourcedEntity(
      override val fqn: FullyQualifiedName,
      override val entityType: String,
      state: Option[State],
      events: Iterable[Event])
      extends Entity(fqn, entityType)

  /**
   * A type of Entity that stores its state using a journal of events, and restores its state by replaying that journal.
   */
  case class ValueEntity(override val fqn: FullyQualifiedName, override val entityType: String, state: State)
      extends Entity(fqn, entityType)

  /**
   * A Service backed by Kalix; either an Action, View or Entity
   */
  sealed abstract class Service(val fqn: FullyQualifiedName, val commands: Iterable[Command])

  /**
   * A Service backed by an Action - a serverless function that is executed based on a trigger. The trigger could be an
   * HTTP or gRPC request or a stream of messages or events.
   */
  case class ActionService(
      override val fqn: FullyQualifiedName,
      override val commands: Iterable[Command],
      userDefinedNameOpt: Option[FullyQualifiedName])
      extends Service(fqn, commands)

  /**
   * A Service backed by a View, which provides a way to retrieve state from multiple Entities based on a query. You can
   * query non-key data items. You can create views from Value Entity state, Event Sourced Entity events, and by
   * subscribing to topics.
   */
  case class ViewService(
      override val fqn: FullyQualifiedName,
      override val commands: Iterable[Command],
      viewId: String,
      transformedUpdates: Iterable[Command],
      userDefinedNameOpt: Option[FullyQualifiedName])
      extends Service(fqn, commands)

  /**
   * A Service backed by a Kalix Entity
   */
  case class EntityService(
      override val fqn: FullyQualifiedName,
      override val commands: Iterable[Command],
      componentFullName: String)
      extends Service(fqn, commands)

  /**
   * A command is used to express the intention to alter the state of an Entity.
   */
  case class Command(
      fqn: FullyQualifiedName,
      inputType: FullyQualifiedName,
      outputType: FullyQualifiedName,
      streamedInput: Boolean,
      streamedOutput: Boolean)

  object Command {
    def from(method: Descriptors.MethodDescriptor): Command = Command(
      FullyQualifiedName.from(method),
      FullyQualifiedName.from(method.getInputType),
      FullyQualifiedName.from(method.getOutputType),
      streamedInput = method.isClientStreaming,
      streamedOutput = method.isServerStreaming)
  }

  /**
   * An event indicates that a change has occurred to an entity. Events are stored in a journal, and are read and
   * replayed each time the entity is reloaded by the Kalix state management system.
   */
  case class Event(fqn: FullyQualifiedName)

  /**
   * The state is simply data—​the current set of values for an entity instance. Event Sourced entities hold their state
   * in memory.
   */
  case class State(fqn: FullyQualifiedName)

  /**
   * Given a protobuf descriptor, discover the Cloudstate entities and their properties.
   *
   * Impure.
   *
   * @param descriptors
   *   the protobuf descriptors containing service entities
   * @return
   *   the entities found
   */
  def introspectProtobufClasses(descriptors: Iterable[Descriptors.FileDescriptor]): Model = {
    val descriptorSeq = descriptors.toSeq

    descriptorSeq.foldLeft(Model.empty) { case (accModel, fileDescriptor) =>
      val modelFromServices =
        fileDescriptor.getServices.asScala.foldLeft(accModel) { (model, serviceDescriptor) =>
          if (serviceDescriptor.getOptions.hasExtension(kalix.Annotations.codegen)) {
            model ++ modelFromCodegenOptions(serviceDescriptor, descriptorSeq)

          } else if (serviceDescriptor.getOptions.hasExtension(kalix.Annotations.service)) {
            // FIXME: old format, builds service model from old service annotation
            model ++ modelFromServiceOptions(serviceDescriptor)
          } else {
            model
          }
        }

      // FIXME: old format, builds entity model from domain.proto file
      val modelFromDomainFile =
        extractEventSourcedEntityDefinitionFromFileOptions(fileDescriptor) ++
        extractValueEntityDefinitionFromFileOptions(fileDescriptor)

      modelFromServices ++ modelFromDomainFile
    }
  }

  private def modelFromServiceOptions(serviceDescriptor: Descriptors.ServiceDescriptor): Model = {
    val serviceOptions =
      serviceDescriptor.getOptions.getExtension(kalix.Annotations.service)
    val serviceType = serviceOptions.getType
    val serviceName = FullyQualifiedName.from(serviceDescriptor)

    val methods = serviceDescriptor.getMethods.asScala
    val commands = methods.map(Command.from)

    serviceType match {
      case ServiceType.SERVICE_TYPE_ENTITY =>
        if (serviceOptions.getComponent eq null) Model.empty
        else {
          val componentName = serviceOptions.getComponent
          val componentFullName =
            resolveFullName(serviceDescriptor.getFile.getPackage, componentName)
          Model.fromService(EntityService(serviceName, commands, componentFullName))
        }

      case ServiceType.SERVICE_TYPE_ACTION =>
        Model.fromService(ActionService(serviceName, commands, None))

      case ServiceType.SERVICE_TYPE_VIEW =>
        val methodDetails = methods.flatMap { method =>
          Option(method.getOptions.getExtension(kalix.Annotations.method).getView).map(viewOptions =>
            (method, viewOptions))
        }
        Model.fromService(
          ViewService(
            serviceName,
            commands,
            viewId = serviceDescriptor.getName,
            transformedUpdates = methodDetails
              .collect {
                case (method, viewOptions) if viewOptions.hasUpdate && viewOptions.getUpdate.getTransformUpdates =>
                  Command.from(method)
              },
            None))
      case _ => Model.empty
    }
  }

  @SuppressWarnings(Array("org.wartremover.warts.Throw"))
  private def modelFromCodegenOptions(
      serviceDescriptor: ServiceDescriptor,
      additionalDescriptors: Seq[Descriptors.FileDescriptor]): Model = {

    val codegenOptions =
      serviceDescriptor.getOptions.getExtension(kalix.Annotations.codegen)
    val serviceName = FullyQualifiedName.from(serviceDescriptor)

    val methods = serviceDescriptor.getMethods.asScala
    val commands = methods.map(Command.from)

    codegenOptions.getCodegenCase match {
      case CodegenOptions.CodegenCase.ACTION =>
        val userDefinedName = buildUserDefinedName(codegenOptions.getAction.getName, serviceName)
        val actionService = ActionService(serviceName, commands, userDefinedName)
        Model.fromService(actionService)

      case CodegenOptions.CodegenCase.VIEW =>
        val userDefinedName = buildUserDefinedName(codegenOptions.getView.getName, serviceName)
        val methodDetails = methods.flatMap { method =>
          Option(method.getOptions.getExtension(kalix.Annotations.method).getView).map(viewOptions =>
            (method, viewOptions))
        }
        Model.fromService(
          ViewService(
            serviceName,
            commands,
            viewId = serviceDescriptor.getName,
            transformedUpdates = methodDetails
              .collect {
                case (method, viewOptions) if viewOptions.hasUpdate && viewOptions.getUpdate.getTransformUpdates =>
                  Command.from(method)
              },
            userDefinedName))

      case CodegenOptions.CodegenCase.VALUE_ENTITY =>
        val entityDef = codegenOptions.getValueEntity
        val componentFullName =
          resolveFullComponentName(entityDef.getName, serviceName)

        Model
          .fromService(EntityService(serviceName, commands, componentFullName))
          .addEntity(extractValueEntity(serviceDescriptor, entityDef, additionalDescriptors))

      case CodegenOptions.CodegenCase.EVENT_SOURCED_ENTITY =>
        val entityDef = codegenOptions.getEventSourcedEntity
        val componentFullName =
          resolveFullComponentName(entityDef.getName, serviceName)

        Model
          .fromService(EntityService(serviceName, commands, componentFullName))
          .addEntity(extractEventSourcedEntity(serviceDescriptor, entityDef, additionalDescriptors))

      case CodegenOptions.CodegenCase.REPLICATED_ENTITY =>
        throw new IllegalArgumentException("Code generation for Replicated Entity not supported yet")
      case _ => Model.empty

    }
  }

  def extractEventSourcedEntity(
      serviceDescriptor: ServiceDescriptor,
      entityDef: EventSourcedEntityDef,
      additionalDescriptors: Seq[Descriptors.FileDescriptor]): EventSourcedEntity = {

    val serviceName = FullyQualifiedName.from(serviceDescriptor)
    val pkg = PackageNaming.from(serviceDescriptor.getFile).pkg

    EventSourcedEntity(
      defineEntityFullyQualifiedName(entityDef.getName, serviceName),
      entityDef.getEntityType,
      Option(entityDef.getState)
        .filter(_.nonEmpty)
        .map(name => State(resolveFullyQualifiedMessageType(name, pkg, additionalDescriptors))),
      entityDef.getEventsList.asScala
        .map(event => Event(resolveFullyQualifiedMessageType(event, pkg, additionalDescriptors))))
  }

  private def extractValueEntity(
      serviceDescriptor: ServiceDescriptor,
      entityDef: ValueEntityDef,
      additionalDescriptors: Seq[Descriptors.FileDescriptor]): ValueEntity = {

    val serviceName = FullyQualifiedName.from(serviceDescriptor)
    val pkg = PackageNaming.from(serviceDescriptor.getFile).pkg

    ValueEntity(
      defineEntityFullyQualifiedName(entityDef.getName, serviceName),
      entityDef.getEntityType,
      State(resolveFullyQualifiedMessageType(entityDef.getState, pkg, additionalDescriptors)))
  }

  /* if optionalName is empty (or null), full component name will be the same as the Service
   * otherwise, we need to resolve the entity name.
   */
  private def resolveFullComponentName(optionalName: String, serviceName: FullyQualifiedName) = {
    val fqn = defineEntityFullyQualifiedName(optionalName, serviceName)
    resolveFullName(fqn.parent.pkg, fqn.name)
  }

  private def nonEmptyName(name: String) =
    Option(name).filter(_.trim.nonEmpty)

  private def buildUserDefinedName(optionalName: String, serviceName: FullyQualifiedName) =
    nonEmptyName(optionalName)
      .map { name =>
        // if filled, we need to resolve the name
        // for example: pkg = foo.bar, name = baz.Qux
        // becomes: pkg = foo.bar.baz, name = Qux
        val (resolvedPackage, resolvedName) = extractPackageAndName(serviceName.parent.pkg, name)
        val packageNaming =
          serviceName.parent.changePackages(resolvedPackage)
        FullyQualifiedName(resolvedName, packageNaming)
      }

  private def defineEntityFullyQualifiedName(optionalName: String, serviceName: FullyQualifiedName) =
    buildUserDefinedName(optionalName, serviceName).getOrElse {
      // when an entity name is not explicitly defined, we need to fabricate a unique name
      // that doesn't conflict with the service name therefore we append 'Entity' to the name
      serviceName
        .deriveName(_ + "Entity")
    }

  /**
   * Lookup a FileDescriptor for the passed `package` and `name`.
   *
   * Valid inputs are:
   *   - package: foo.bar.baz, name: Foo
   *   - package: foo.bar, name: .baz.Foo
   *
   * The above input will trigger a lookup for a descriptor defining package "foo.bar.baz" and message "Foo"
   */
  @SuppressWarnings(Array("org.wartremover.warts.Throw"))
  private def lookupDescriptor(
      resolvedPackage: String,
      resolvedName: String,
      additionalDescriptors: Seq[Descriptors.FileDescriptor]): Descriptors.FileDescriptor = {

    // we should have only one match for package and resolvedName
    // if more than one proto defines the same message and package it will be caught earlier, by protoc
    additionalDescriptors
      .find { desc =>
        desc.getPackage == resolvedPackage && desc.getMessageTypes.asScala.exists(_.getName == resolvedName)
      }
      .getOrElse {
        throw new IllegalArgumentException(
          s"No descriptor found declaring package [$resolvedPackage] and message [$resolvedName]")
      }
  }

  /**
   * Resolves a proto 'message' using `package` and `name`.
   *
   * Valid inputs are:
   *   - package: foo.bar.baz, name: Foo
   *   - package: foo.bar, name: .baz.Foo
   *
   * The above input will trigger a lookup for a descriptor defining package "foo.bar.baz" and message "Foo"
   *
   * @return
   *   the FQN for a proto 'message' (which are used not just for "messages", but also for state types etc)
   */
  private def resolveFullyQualifiedMessageType(
      name: String,
      pkg: String,
      additionalDescriptors: Seq[Descriptors.FileDescriptor]): FullyQualifiedName = {

    val (revolvedPackage, resolvedName) = extractPackageAndName(pkg, name)
    val descriptor = lookupDescriptor(revolvedPackage, resolvedName, additionalDescriptors)
    resolveFullyQualifiedMessageType(resolvedName, descriptor, additionalDescriptors)
  }

  /**
   * @return
   *   the FQN for a proto 'message' (which are used not just for "messages", but also for state types etc)
   */
  @SuppressWarnings(Array("org.wartremover.warts.Throw"))
  private def resolveFullyQualifiedMessageType(
      name: String,
      descriptor: Descriptors.FileDescriptor,
      descriptors: Seq[Descriptors.FileDescriptor]): FullyQualifiedName = {

    val fullName = resolveFullName(descriptor.getPackage, name)
    val protoPackage = fullName.split("\\.").init.mkString(".")
    val protoName = fullName.split("\\.").last
    // TODO we could also look at the imports in the proto file to support
    // importing names from outside this file without using their fully qualified name.
    descriptors
      .filter(_.getPackage == protoPackage)
      .flatMap(_.getMessageTypes.asScala)
      .filter(_.getName == protoName) match {
      case Nil =>
        throw new IllegalStateException(
          s"No descriptor found for [$fullName] (searched: [${descriptors.map(_.getFile.getName).mkString(", ")}])")
      case Seq(descriptor) =>
        FullyQualifiedName.from(descriptor)
      case matchingDescriptors =>
        throw new IllegalStateException(s"Multiple matching descriptors found for [$fullName] (searched: [${descriptors
          .map(_.getFile.getName)
          .mkString(", ")}], found in: ${matchingDescriptors.map(_.getFile.getName).mkString(", ")})")
    }

  }

  /**
   * Extracts any defined event sourced entity from the provided protobuf file descriptor
   *
   * @param descriptor
   *   the file descriptor to extract from
   */
  private def extractEventSourcedEntityDefinitionFromFileOptions(descriptor: Descriptors.FileDescriptor): Model = {

    val entityDef = descriptor.getOptions
      .getExtension(kalix.Annotations.file)
      .getEventSourcedEntity

    val protoReference = PackageNaming.from(descriptor)

    nonEmptyName(entityDef.getName)
      .map { name =>
        Model.fromEntity(
          EventSourcedEntity(
            FullyQualifiedName(name, protoReference),
            entityDef.getEntityType,
            Option(entityDef.getState)
              .filter(_.nonEmpty)
              .map(name => State(FullyQualifiedName(name, protoReference))),
            entityDef.getEventsList.asScala
              .map(event => Event(FullyQualifiedName(event, protoReference)))))
      }
      .getOrElse(Model.empty)
  }

  /**
   * Extracts any defined value entity from the provided protobuf file descriptor
   *
   * @param descriptor
   *   the file descriptor to extract from
   */
  private def extractValueEntityDefinitionFromFileOptions(descriptor: Descriptors.FileDescriptor): Model = {

    val entityDef =
      descriptor.getOptions
        .getExtension(kalix.Annotations.file)
        .getValueEntity

    val protoReference = PackageNaming.from(descriptor)

    nonEmptyName(entityDef.getName)
      .map { name =>
        Model.fromEntity(
          ValueEntity(
            FullyQualifiedName(name, protoReference),
            entityDef.getEntityType,
            State(FullyQualifiedName(entityDef.getState, protoReference))))
      }
      .getOrElse(Model.empty)

  }

  /**
   * Resolves the provided name relative to the provided package
   *
   * @param name
   *   the name to resolve
   * @param pkg
   *   the package to resolve relative to
   * @return
   *   the resolved full name
   */
  private[codegen] def resolveFullName(pkg: String, name: String) =
    name.indexOf('.') match {
      case 0 => // name starts with a dot, treat as relative to package
        s"$pkg$name"
      case -1 => // name contains no dots, prepend package
        s"$pkg.$name"
      case _ => // name contains at least one dot, treat as absolute
        name
    }

  /**
   * Resolves the provided name relative to the provided package and split it back into name and package
   *
   * (foo.bar, baz.Foo) => (foo.bar.baz, Foo)
   */
  private def extractPackageAndName(pkg: String, name: String): (String, String) = {
    val resolvedPackageAndName = resolveFullName(pkg, name)
    val idx = resolvedPackageAndName.lastIndexOf('.')
    val resolvedName = resolvedPackageAndName.drop(idx + 1)
    val resolvedPackage = resolvedPackageAndName.take(idx)
    (resolvedPackage, resolvedName)
  }

}
