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

import { MockValueEntity } from "@kalix-io/testkit";
import { expect } from "chai";
import counter from "../src/counter.js";

const CounterState = counter.lookupType("com.example.domain.CounterState");

describe("CounterService", () => {
  const entityId = "entityId";

  describe("Increase", () => {

    it("should increase the value with no prior state", () => {
      const entity = new MockValueEntity(counter, entityId);
      const result = entity.handleCommand("Increase", { entityId: entityId, value: 42 });

      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(CounterState.create({ value: 42 }));
    });

    it("should increase the value with some prior state", () => {
      const entity = new MockValueEntity(counter, entityId);
      entity.state = CounterState.create({ value: 13 });
      const result = entity.handleCommand("Increase", { entityId: entityId, value: 42 });

      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(CounterState.create({ value: 13 + 42 }));
    });

    it("should fail on negative values", () => {
      const entity = new MockValueEntity(counter, entityId);
      const result = entity.handleCommand("Increase", { entityId: entityId, value: -2 });

      expect(result).to.deep.equal({});
      expect(entity.error).to.be.equal(`Increase requires a positive value. It was [-2].`);
    });
  });

  describe("Decrease", () => {
    it("should decrease the value with no prior state.", () => {
      const entity = new MockValueEntity(counter, entityId);
      const result = entity.handleCommand("Decrease", { entityId: entityId, value: 42 });

      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(CounterState.create({ value: -42 }));
    });
  });

  describe("Reset", () => {
    it("should reset the entity value to 0", () => {
      const entity = new MockValueEntity(counter, entityId);
      entity.state = CounterState.create({ value: 13 });
      const result = entity.handleCommand("Reset", { entityId: entityId });

      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(CounterState.create({ value: 0 }));
    });
  });

  describe("GetCurrentCounter", () => {
    it("should return the current state", () => {
      const entity = new MockValueEntity(counter, entityId);
      entity.state = CounterState.create({ value: 13 });
      const result = entity.handleCommand("GetCurrentCounter", { entityId: entityId });

      expect(result).to.deep.equal({ value: 13 });
      expect(entity.error).to.be.undefined;
      expect(entity.state).to.deep.equal(CounterState.create({ value: 13 }));
    });
  });
});
