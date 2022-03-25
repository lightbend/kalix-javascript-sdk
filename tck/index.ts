/*
 * Copyright 2021 Lightbend Inc.
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

import { Kalix } from '@lightbend/akkaserverless-javascript-sdk';

import * as action from './src/action';
import * as valueEntity from './src/value-entity';
import * as eventSourcedEntity from './src/event-sourced-entity';
import * as replicatedEntity from './src/replicated-entity';
import * as view from './src/view';
import * as eventing from './src/eventing';

const service = new Kalix()
  .addComponent(action.tckModel)
  .addComponent(action.two)
  .addComponent(valueEntity.tckModel)
  .addComponent(valueEntity.two)
  .addComponent(valueEntity.configured)
  .addComponent(eventSourcedEntity.tckModel)
  .addComponent(eventSourcedEntity.two)
  .addComponent(eventSourcedEntity.configured)
  .addComponent(replicatedEntity.tckModel)
  .addComponent(replicatedEntity.two)
  .addComponent(replicatedEntity.configured)
  .addComponent(view.tckModel)
  .addComponent(view.viewSource)
  .addComponent(eventing.eventSourcedEntityOne)
  .addComponent(eventing.eventSourcedEntityTwo)
  .addComponent(eventing.valueEntityOne)
  .addComponent(eventing.valueEntityTwo)
  .addComponent(eventing.localPersistenceSubscriber);

service.start();

export default service;
