/*
 * Copyright 2019 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless;
const server = new AkkaServerless();
const action = require("./action.js");
server.addComponent(action.tckModel);
server.addComponent(action.two);
const crdt = require("./crdt.js");
server.addComponent(crdt.tckModel);
server.addComponent(crdt.two);
server.addComponent(crdt.configured);
const eventSourced = require("./eventsourced.js");
server.addComponent(eventSourced.tckModel);
server.addComponent(eventSourced.two);
server.addComponent(eventSourced.configured);
const valueEntity = require("./value-entity.js");
server.addComponent(valueEntity.tckModel);
server.addComponent(valueEntity.two);
server.addComponent(valueEntity.configured);
const eventLogEventing = require("./event-log-eventing.js");
server.addComponent(eventLogEventing.eventSourcedEntityOne);
server.addComponent(eventLogEventing.eventSourcedEntityTwo);
server.addComponent(eventLogEventing.eventLogSubscriber);
server.start();
