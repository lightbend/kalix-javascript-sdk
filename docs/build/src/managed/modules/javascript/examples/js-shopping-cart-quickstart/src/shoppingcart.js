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

import { EventSourcedEntity, Reply } from "@kalix-io/kalix-javascript-sdk";

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 *
 * ShoppingCart; a strongly typed extension of EventSourcedEntity derived from your proto source
 * @typedef { import("../lib/generated/shoppingcart").ShoppingCart } ShoppingCart
 * @typedef { import("../lib/generated/shoppingcart").ShoppingCart.CommandHandlers } CommandHandlers
 * @typedef { import("../lib/generated/shoppingcart").ShoppingCart.EventHandlers } EventHandlers
 */

/**
 * @type ShoppingCart
 */
const entity = new EventSourcedEntity(
  [
    "shopping_cart_api.proto",
    "kalix_policy.proto",
    "shopping_cart_domain.proto"
  ],
  "shopping.cart.api.ShoppingCart",
  "shopping-cart",
  {
    includeDirs: ["./proto"]
  }
);

const CartState = entity.lookupType("shopping.cart.domain.CartState");
const ItemAdded = entity.lookupType("shopping.cart.domain.ItemAdded");
const ItemRemoved = entity.lookupType("shopping.cart.domain.ItemRemoved");

entity.setInitial(entityId => CartState.create({}));

// tag::setBehavior[]
entity.setBehavior(state => ({
  commandHandlers: {
    AddItem: addItem,
    RemoveItem: removeItem,
    GetCart: getCart
  },
  eventHandlers: {
    ItemAdded: itemAdded,
    ItemRemoved: itemRemoved
  }
}));
// end::setBehavior[]

/**
 * @type CommandHandlers['AddItem']
 */
// tag::addItem[]
function addItem(addItem, _cart, ctx) {
  if (addItem.quantity < 1) {
    return Reply.failure(
      `Quantity for item ${addItem.productId} must be at least one.`
    );
  } else {
    const itemAdded = ItemAdded.create({
      item: {
        productId: addItem.productId,
        name: addItem.name,
        quantity: addItem.quantity
      }
    });
    ctx.emit(itemAdded);
    return Reply.message({});
  }
}
// end::addItem[]

/**
 * @type CommandHandlers['RemoveItem']
 */
// tag::removeItem[]
function removeItem(removeItem, cart, ctx) {
  const existing = cart.items.find(item =>
    item.productId === removeItem.productId
  );

  if (!existing) {
    return Reply.failure(
      `Cannot remove item ${removeItem.productId} because it is not in the cart.`
    );
  } else {
    const itemRemoved = ItemRemoved.create({
      productId: removeItem.productId
    });
    ctx.emit(itemRemoved);
    return Reply.message({});
  }
}
// end::removeItem[]

/**
 * @type CommandHandlers['GetCart']
 */
// tag::getCart[]
function getCart(_getShoppingCart, cart) {
  // API and domain messages have the same fields so conversion is easy
  return Reply.message(cart);
}
// end::getCart[]

/**
 * @type EventHandlers['ItemAdded']
 */
// tag::itemAdded[]
function itemAdded(added, cart) {
  const existing = cart.items.find(item =>
    item.productId === added.item.productId
  );

  if (existing) {
    existing.quantity = existing.quantity + added.item.quantity;
  } else {
    cart.items.push(added.item);
  }

  return cart;
}
// end::itemAdded[]

/**
 * @type EventHandlers['ItemRemoved']
 */
// tag::itemRemoved[]
function itemRemoved(removed, cart) {
  cart.items = cart.items.filter(item =>
    item.productId !== removed.productId
  );

  return cart;
}
// end::itemRemoved[]

export default entity;
