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

import { EventSourcedEntity, Reply } from "@kalix-io/kalix-javascript-sdk";
import { ShoppingCart } from "../lib/generated/shoppingcart";
// tag::imports[]
import { api, domain } from "../lib/generated/shoppingcart";
// end::imports[]

const entity: ShoppingCart = new EventSourcedEntity(
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

// tag::addItem[]
function addItem(
  addLineItem: api.AddLineItem,
  _cartState: domain.CartState,
  context: ShoppingCart.CommandContext
): Reply<api.IEmpty> {
  if (addLineItem.quantity < 1) {
    return Reply.failure(
      `Quantity for item ${addLineItem.productId} must be at least one.`
    );
  } else {
    const itemAdded = ItemAdded.create({
      item: {
        productId: addLineItem.productId,
        name: addLineItem.name,
        quantity: addLineItem.quantity
      }
    });
    context.emit(itemAdded);
    return Reply.message({});
  }
}
// end::addItem[]

// tag::removeItem[]
function removeItem(
  removeLineItem: api.RemoveLineItem,
  cartState: domain.CartState,
  context: ShoppingCart.CommandContext
): Reply<api.IEmpty> {
  const existing = (cartState.items ?? []).find(item =>
    item.productId === removeLineItem.productId
  );

  if (!existing) {
    const id = removeLineItem.productId;
    return Reply.failure(
      `Cannot remove item ${id} because it is not in the cart.`
    );
  } else {
    const itemRemoved = ItemRemoved.create({
      productId: removeLineItem.productId
    });
    context.emit(itemRemoved);
    return Reply.message({});
  }
}
// end::removeItem[]

// tag::getCart[]
function getCart(
  _getShoppingCart: api.GetShoppingCart,
  cartState: domain.CartState
): Reply<api.ICart> {
  // API and domain messages have the same fields so conversion is easy
  return Reply.message(cartState);
}
// end::getCart[]

// tag::itemAdded[]
function itemAdded(
  added: domain.ItemAdded,
  cart: domain.CartState
): domain.CartState {
  const existing = (cart.items ?? []).find(item =>
    item.productId === added.item?.productId
  );

  if (existing && existing.quantity) {
    existing.quantity += added.item?.quantity ?? 0;
  } else if (added.item) {
    if (!cart.items) cart.items = [];
    cart.items.push(added.item);
  }

  return cart;
}
// end::itemAdded[]

// tag::itemRemoved[]
function itemRemoved(
  removed: domain.ItemRemoved,
  cart: domain.CartState
): domain.CartState {
  cart.items = (cart.items ?? []).filter(item =>
    item.productId !== removed.productId
  );

  return cart;
}
// end::itemRemoved[]

export default entity;
