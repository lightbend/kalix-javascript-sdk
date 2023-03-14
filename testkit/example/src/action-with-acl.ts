/*
 * Copyright 2021-2023 Lightbend Inc.
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

import {
  Action,
  GrpcClientCreator,
  GrpcClientLookup,
  LocalServicePrincipal,
  PredefinedPrincipal,
  Principal,
  replies,
} from '@kalix-io/kalix-javascript-sdk';
import { ExampleActionWithAclService } from '../types/action';

const action: ExampleActionWithAclService = new Action(
  'example.proto',
  'com.example.ExampleActionWithACLService',
  {
    includeDirs: ['example/proto'],
  },
);

function principalToString(principal: Principal) {
  if (principal instanceof LocalServicePrincipal) {
    return principal.name;
  } else {
    switch (principal) {
      case PredefinedPrincipal.Self:
        return 'self';
      case PredefinedPrincipal.Backoffice:
        return 'backoffice';
      case PredefinedPrincipal.Internet:
        return 'internet';
    }
  }
}

action.commandHandlers = {
  Public: (input, context) => {
    return {
      field:
        'Received: ' +
        input.field +
        ', principals: ' +
        context.metadata.principals().get().map(principalToString),
    };
  },
  OnlyFromOtherService: (input, context) => {
    return {
      field:
        'Received: ' +
        input.field +
        ', principals: ' +
        context.metadata.principals().get().map(principalToString),
    };
  },
  OnlyFromSelf: (input, context) => {
    return {
      field:
        'OnlyFromSelf Received: ' +
        input.field +
        ', principals: ' +
        context.metadata.principals().get().map(principalToString),
    };
  },
  DelegateToSelf: async (input) => {
    // FIXME TS lookup doesn't seem to quite work for nested packages, needs this mess:
    const clientFactory = (
      (action.clients!.com as GrpcClientLookup).example as GrpcClientLookup
    ).ExampleActionWithACLService as GrpcClientCreator;
    const client = clientFactory.createClient();
    try {
      return await client.OnlyFromSelf(input);
    } catch (e) {
      console.error('Calling self failed', e);
      return replies.failure('Cross component call failed');
    }
  },
};

export default action;
