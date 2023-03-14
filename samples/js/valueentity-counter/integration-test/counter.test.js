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

import { IntegrationTestkit } from "@kalix-io/testkit";
import { expect } from "chai";
import counter from "../src/counter.js";

const testkit = new IntegrationTestkit();
testkit.addComponent(counter);

function client() {
  return testkit.clients.CounterService;
}

describe("Counter service", function() {

  this.timeout(60000);

  before(done => testkit.start(done));
  after(done => testkit.shutdown(done));

  it("should increase non existing entity", async () => {
    const entityId = "new-id";
    await client().increaseAsync({ counterId: entityId, value: 42 });
    const result = await client().getCurrentCounterAsync({ counterId: entityId });
    expect(result).to.deep.equal({ value: 42 });
  });

  it("should increase another entity", async () => {
    const entityId = "another-id";
    await client().increaseAsync({ counterId: entityId, value: 42 });
    await client().increaseAsync({ counterId: entityId, value: 27 });
    const result = await client().getCurrentCounterAsync({ counterId: entityId });
    expect(result).to.deep.equal({ value: 69 });
  });

});
