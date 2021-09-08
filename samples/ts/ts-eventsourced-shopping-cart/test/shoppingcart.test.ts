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

import { MockEventSourcedEntity } from "./testkit";
import { expect } from "chai";
import shoppingcart from "../src/shoppingcart";
import * as proto from "../lib/generated/proto";

type State = proto.com.example.shoppingcart.domain.Cart;

const pkg = "com.example.shoppingcart.domain.";
import domain from "../src/shoppingcart";

const ItemAdded = domain.lookupType(pkg + "ItemAdded");
const ItemRemoved = domain.lookupType(pkg + "ItemRemoved");

describe("ShoppingCartService", () => {
  const entityId = "entityId";

  describe("AddItem", () => {
    it("should respond to addItem commands", () => {
      const entity = new MockEventSourcedEntity<State>(shoppingcart, entityId);
      entity.handleCommand(
        "AddItem", {cartId: "cart1", productId: "a", name: "Apple", quantity: 1});
      entity.handleCommand(
        "AddItem", {cartId: "cart1", productId: "b", name: "Banana", quantity: 2});
      entity.handleCommand(
        "AddItem", {cartId: "cart1", productId: "c", name: "Cantaloupe", quantity: 3});

      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
        [
          {productId: 'a', name: 'Apple', quantity: 1},
          {productId: 'b', name: 'Banana', quantity: 2},
          {productId: 'c', name: 'Cantaloupe', quantity: 3}
        ]);

      expect(entity.events).to.deep.equal(
        [
          ItemAdded.create({item: {productId: 'a', name: 'Apple', quantity: 1}}),
          ItemAdded.create({item: {productId: 'b', name: 'Banana', quantity: 2}}),
          ItemAdded.create({item: {productId: 'c', name: 'Cantaloupe', quantity: 3}})
        ]);
    });
  });

  describe("RemoveItem", () => {
    it("should remove items from a cart", () => {
      const entity = new MockEventSourcedEntity<State>(shoppingcart, entityId);

      entity.handleCommand(
        "AddItem", {cartId: "cart1", productId: "a", name: "Apple", quantity: 1});
      entity.handleCommand(
        "AddItem", {cartId: "cart1", productId: "b", name: "Banana", quantity: 2});

      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
        [
          {productId: 'a', name: 'Apple', quantity: 1},
          {productId: 'b', name: 'Banana', quantity: 2}
        ]);

      expect(entity.events).to.deep.equal(
        [
          ItemAdded.create({item: {productId: 'a', name: 'Apple', quantity: 1}}),
          ItemAdded.create({item: {productId: 'b', name: 'Banana', quantity: 2}}),
        ]);

      entity.handleCommand(
        "RemoveItem", {cartId: "cart1", productId: "a"});
      expect(entity.error).to.be.undefined;
      expect(entity.state.items)
        .to.deep.equal(
        [
          {productId: 'b', name: 'Banana', quantity: 2}
        ]);

      expect(entity.events).to.deep.equal(
        [
          ItemAdded.create({item: {productId: 'a', name: 'Apple', quantity: 1}}),
          ItemAdded.create({item: {productId: 'b', name: 'Banana', quantity: 2}}),
          ItemRemoved.create({productId: 'a'})
        ]);
    });
  });

  describe("GetCart", () => {
    it("should default to an empty cart", () => {
      const entity = new MockEventSourcedEntity<State>(shoppingcart, entityId);
      const result = entity.handleCommand("GetCart", {entityId});
      expect(result).to.deep.equal({});
      expect(entity.error).to.be.undefined;
      expect(entity.state.items).to.be.empty;
      expect(entity.events).to.be.empty;
    });
  });

})
