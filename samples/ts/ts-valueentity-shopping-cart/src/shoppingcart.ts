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
import { ValueEntity, replies } from "@lightbend/kalix-javascript-sdk";
import * as proto from "../lib/generated/proto";

type Context = ValueEntity.ValueEntityCommandContext;

type State = proto.com.example.shoppingcart.domain.Cart;

type AddLineItem = proto.com.example.shoppingcart.AddLineItem;
type RemoveLineItem = proto.com.example.shoppingcart.RemoveLineItem;
type GetShoppingCart = proto.com.example.shoppingcart.GetShoppingCart;
type RemoveShoppingCart = proto.com.example.shoppingcart.RemoveShoppingCart;

/**
 * Type definitions.
 * These types have been generated based on your proto source.
 * A TypeScript aware editor such as VS Code will be able to leverage them to provide hinting and validation.
 *
 * State; the serialisable and persistable state of the entity
 * @typedef { import("../lib/generated/shoppingcartservice").State } State
 *
 * ShoppingCartService; a strongly typed extension of ValueEntity derived from your proto source
 * @typedef { import("../lib/generated/shoppingcartservice").ShoppingCartService } ShoppingCartService
 */

/**
 * @type ShoppingCartService
 */
const entity: ValueEntity = new ValueEntity(
  ["shoppingcart_domain.proto", "shoppingcart_api.proto"],
  "com.example.shoppingcart.ShoppingCartService",
  "shopping-cart",
  {
    includeDirs: ["./proto"],
    serializeFallbackToJson: true
  }
);

/*
 * Here we load the Protobuf types. When setting state, we need to return
 * protobuf message objects, not just ordinary JavaScript objects, so that the framework can
 * know how to serialize these objects when they are persisted.
 *
 * Note this shows loading them dynamically, they could also be compiled and statically loaded.
 */
const pkg = "com.example.shoppingcart.domain.";
const Cart = entity.lookupType(pkg + "Cart");

/*
 * Set a callback to create the initial state. This is what is created if there is no
 * snapshot to load.
 *
 * We can ignore the cartId parameter if we want, it's the id of the entity, which is
 * automatically associated with all events and state for this entity.
 */
entity.setInitial(cartId => Cart.create({ items: [] }));

/*
 * Command handlers. The name of the command corresponds to the name of the rpc call in
 * the gRPC service that this entity offers.
 */
entity.setCommandHandlers({
  AddItem: addItem,
  RemoveItem: removeItem,
  GetCart: getCart,
  RemoveCart: removeCart
});

/**
 * Handler for add item commands.
 */
function addItem(
  addItem: AddLineItem,
  cart: State,
  ctx: Context
): replies.Reply {
  // Validation:
  // Make sure that it is not possible to add negative quantities
  if (addItem.quantity < 1) {
    return replies.failure(
      "Quantity for item " + addItem.productId + " must be greater than zero."
    );
  } else {
    // If there is an existing item with that product id, we need to increment its quantity.
    const existing = cart.items.find(item => {
      return item.productId === addItem.productId;
    });

    if (existing) {
      existing.quantity = (existing.quantity || 0) + addItem.quantity;
    } else {
      // Otherwise, we just add the item to the existing list.
      cart.items.push(addItem);
    }
    ctx.updateState(cart);
  }
  return replies.message({});
}

/**
 * Handler for remove item commands.
 */
function removeItem(
  removeItem: RemoveLineItem,
  cart: State,
  ctx: Context
): replies.Reply {
  // Validation:
  // Check that the item that we're removing actually exists.
  const existing = cart.items.find(item => {
    return item.productId === removeItem.productId;
  });

  // If not, fail the command.
  if (!existing) {
    return replies.failure("Item " + removeItem.productId + " not in cart");
  } else {
    // Otherwise, remove the item.
    // Filter the removed item from the items by product id.
    cart.items = cart.items.filter(item => {
      return item.productId !== removeItem.productId;
    });

    ctx.updateState(cart);
  }
  return replies.message({});
}

/**
 * Handler for get cart commands.
 */
function getCart(request: GetShoppingCart, cart: State): replies.Reply {
  // Simply return the shopping cart as is.
  return replies.message(cart);
}

/**
 * Handler for remove cart commands.
 */
function removeCart(
  request: RemoveShoppingCart,
  cart: State,
  ctx: Context
): replies.Reply {
  ctx.deleteState();
  return replies.message({});
}

export default entity;
