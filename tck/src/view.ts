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

import { ValueEntity, View } from '@lightbend/kalix-javascript-sdk';
import protocol from '../generated/tck';

type Event = protocol.kalix.tck.model.view.Event;
type ViewState = protocol.kalix.tck.model.view.ViewState;

export const tckModel = new View(
  'proto/view.proto',
  'kalix.tck.model.view.ViewTckModel',
).setUpdateHandlers({
  ProcessUpdateUnary: processUpdateUnary,
});

function processUpdateUnary(
  userEvent: Event,
  previousViewState: ViewState,
): ViewState {
  if (userEvent.returnAsIs?.data) {
    return {
      data: userEvent.returnAsIs.data,
    };
  } else if (userEvent.uppercaseThis?.data) {
    return {
      data: userEvent.uppercaseThis.data.toUpperCase(),
    };
  } else if (userEvent.appendToExistingState) {
    return {
      data: previousViewState.data + userEvent.appendToExistingState.data,
    };
  } else if (userEvent.fail) {
    throw Error('requested failure');
  } else if (userEvent.ignore) {
    return previousViewState;
  } else {
    throw Error('Unexpected event type: ' + JSON.stringify(userEvent));
  }
}

export const viewSource = new ValueEntity(
  ['proto/view.proto'],
  'kalix.tck.model.view.ViewTckSource',
  'view-source',
);
