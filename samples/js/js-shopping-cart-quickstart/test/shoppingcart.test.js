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

import { MockEventSourcedEntity } from "@kalix-io/testkit";
import { expect } from "chai";
import shoppingCart from "../src/shoppingcart.js";

const ItemAdded = shoppingCart.lookupType("shopping.cart.domain.ItemAdded");
const ItemRemoved = shoppingCart.lookupType("shopping.cart.domain.ItemRemoved");

describe("ShoppingCart", () => {
  const entityId = "entityId";

  describe("AddItem", () => {
    it("should add items to the cart", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "a",
        name: "Apple",
        quantity: 1,
      });

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "b",
        name: "Banana",
        quantity: 2,
      });

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "c",
        name: "Cantaloupe",
        quantity: 3,
      });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.deep.equal([
        { productId: "a", name: "Apple", quantity: 1 },
        { productId: "b", name: "Banana", quantity: 2 },
        { productId: "c", name: "Cantaloupe", quantity: 3 },
      ]);
      expect(entity.events).to.deep.equal([
        ItemAdded.create({ item: { productId: "a", name: "Apple", quantity: 1 } }),
        ItemAdded.create({ item: { productId: "b", name: "Banana", quantity: 2 } }),
        ItemAdded.create({ item: { productId: "c", name: "Cantaloupe", quantity: 3 } }),
      ]);
    });

    it("should fail to add items with invalid quantity", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "z",
        name: "Zilch",
        quantity: 0,
      });

      expect(entity.error).to.equal("Quantity for item z must be at least one.");
      expect(entity.state.items).to.be.empty;
      expect(entity.events).to.be.empty;
    });
  });

  describe("RemoveItem", () => {
    it("should remove items from a cart", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "a",
        name: "Apple",
        quantity: 1,
      });

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "b",
        name: "Banana",
        quantity: 2,
      });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.deep.equal([
        { productId: "a", name: "Apple", quantity: 1 },
        { productId: "b", name: "Banana", quantity: 2 },
      ]);
      expect(entity.events).to.deep.equal([
        ItemAdded.create({ item: { productId: "a", name: "Apple", quantity: 1 } }),
        ItemAdded.create({ item: { productId: "b", name: "Banana", quantity: 2 } }),
      ]);

      await entity.handleCommand("RemoveItem", { cartId: "cart1", productId: "a" });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.deep.equal([
        { productId: "b", name: "Banana", quantity: 2 },
      ]);
      expect(entity.events).to.deep.equal([
        ItemAdded.create({ item: { productId: "a", name: "Apple", quantity: 1 } }),
        ItemAdded.create({ item: { productId: "b", name: "Banana", quantity: 2 } }),
        ItemRemoved.create({ productId: "a" }),
      ]);
    });

    it("should fail to remove items that don't exist", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      await entity.handleCommand("RemoveItem", {
        cartId: "cart1",
        productId: "x",
      });

      expect(entity.error).to.equal("Cannot remove item x because it is not in the cart.");
      expect(entity.state.items).to.be.empty;
      expect(entity.events).to.be.empty;
    });
  });

  describe("GetCart", () => {
    it("should default to an empty cart", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      const response = await entity.handleCommand("GetCart", { entityId });

      expect(response).to.deep.equal({});

      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.be.empty;
      expect(entity.events).to.be.empty;
    });

    it("should retrieve a cart", async () => {
      const entity = new MockEventSourcedEntity(shoppingCart, entityId);

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "a",
        name: "Apple",
        quantity: 1,
      });

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "b",
        name: "Banana",
        quantity: 2,
      });

      await entity.handleCommand("AddItem", {
        cartId: "cart1",
        productId: "c",
        name: "Cantaloupe",
        quantity: 3,
      });

      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.deep.equal([
        { productId: "a", name: "Apple", quantity: 1 },
        { productId: "b", name: "Banana", quantity: 2 },
        { productId: "c", name: "Cantaloupe", quantity: 3 },
      ]);
      expect(entity.events).to.deep.equal([
        ItemAdded.create({ item: { productId: "a", name: "Apple", quantity: 1 } }),
        ItemAdded.create({ item: { productId: "b", name: "Banana", quantity: 2 } }),
        ItemAdded.create({ item: { productId: "c", name: "Cantaloupe", quantity: 3 } }),
      ]);

      const response = await entity.handleCommand("GetCart", { cartId: "cart1" });

      expect(response).to.deep.equal({
        items: [
          { productId: "a", name: "Apple", quantity: 1 },
          { productId: "b", name: "Banana", quantity: 2 },
          { productId: "c", name: "Cantaloupe", quantity: 3 },
        ],
      });
    });
  });
});
