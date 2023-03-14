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

import { MockValueEntity } from "@kalix-io/testkit";
import { expect } from "chai";
import shoppingcart from "../src/shoppingcart.js";

describe("ShoppingCartService", () => {
  const entityId = "entityId";

  describe("AddItem", () => {
    it("should respond to addItem commands", async () => {
      const entity = new MockValueEntity(shoppingcart, entityId);

      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "a", name: "Apple", quantity: 1 });
      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "b", name: "Banana", quantity: 2 });
      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "c", name: "Cantaloupe", quantity: 3 });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
          [
            { cartId: 'cart1', productId: 'a', name: 'Apple', quantity: 1 },
            { cartId: 'cart1', productId: 'b', name: 'Banana', quantity: 2 },
            { cartId: 'cart1', productId: 'c', name: 'Cantaloupe', quantity: 3 }
          ]);
    });
  });

  describe("RemoveItem", () => {
    it("should remove items from a cart", async () => {
      const entity = new MockValueEntity(shoppingcart, entityId);

      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "a", name: "Apple", quantity: 1 });
      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "b", name: "Banana", quantity: 2 });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
          [
            { cartId: 'cart1', productId: 'a', name: 'Apple', quantity: 1 },
            { cartId: 'cart1', productId: 'b', name: 'Banana', quantity: 2 }
          ]);

      await entity.handleCommand(
        "RemoveItem", { cartId: "cart1", productId: "a" });
      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
          [
            { cartId: 'cart1', productId: 'b', name: 'Banana', quantity: 2 }
          ]);
    });
  });

  describe("GetCart", () => {
    it("should default to an empty cart", async () => {
      const entity = new MockValueEntity(shoppingcart, entityId);
      const result = await entity.handleCommand("GetCart", { entityId });
      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.be.empty;
    });
  });

  describe("RemoveCart", () => {
    it("should remove a cart", async () => {

      const entity = new MockValueEntity(shoppingcart, entityId);

      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "a", name: "Apple", quantity: 1 });
      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "b", name: "Banana", quantity: 2 });
      await entity.handleCommand(
        "AddItem", { cartId: "cart1", productId: "c", name: "Cantaloupe", quantity: 3 });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
          [
            { cartId: 'cart1', productId: 'a', name: 'Apple', quantity: 1 },
            { cartId: 'cart1', productId: 'b', name: 'Banana', quantity: 2 },
            { cartId: 'cart1', productId: 'c', name: 'Cantaloupe', quantity: 3 }
          ]);

      await entity.handleCommand(
        "RemoveCart", { cartId: "cart1" })
      expect(entity.state.items).to.be.empty
    });
  });
});
