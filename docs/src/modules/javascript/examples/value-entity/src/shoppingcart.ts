/*
 * Copyright 2021 Lightbend Inc.
 */


import * as proto from "../lib/generated/proto";
import { replies } from "@kalix-io/sdk";

// tag::entity-class[]
import { ValueEntity } from "@kalix-io/sdk";

const entity: ValueEntity = new ValueEntity(
  ["shoppingcart.proto", "domain.proto"],
  "example.shoppingcart.ShoppingCartService",
  "shopping-cart"
);
// end::entity-class[]

type Context = ValueEntity.ValueEntityCommandContext;

type State = proto.com.example.shoppingcart.domain.Cart;

type AddLineItem = proto.com.example.shoppingcart.AddLineItem;
type RemoveLineItem = proto.com.example.shoppingcart.RemoveLineItem;
type GetShoppingCart = proto.com.example.shoppingcart.GetShoppingCart;
type RemoveShoppingCart = proto.com.example.shoppingcart.RemoveShoppingCart;

// tag::lookup-type[]
const Cart = entity.lookupType("example.shoppingcart.Cart");
// end::lookup-type[]

// tag::initial[]
entity.setInitial(userId => Cart.create({ items: [] }));
// end::initial[]

/*
 * Command handlers. The name of the command corresponds to the name of the rpc call in
 * the gRPC service that this entity offers.
 */
entity.setCommandHandlers({
  AddItem: addItem,
  RemoveItem: removeItem,
  GetCart: getCart
});

// tag::add-item[]
function addItem(
    addItem: AddLineItem,
    cart: State,
    ctx: Context
): replies.Reply {
  // Validation:
  // Make sure that it is not possible to add negative quantities
  if (addItem.quantity < 1) {
    return replies.failure(
        "Quantity for item " + addItem.productId + " must be greater than zero.",
        replies.GrpcStatus.InvalidArgument, // optional parameter, customise gRPC code
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
// end::add-item[]

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

// tag::get-cart[]
function getCart(request: GetShoppingCart, cart: State): replies.Reply {
  return replies.message(cart);
}
// end::get-cart[]

// Export the entity
export default entity;


// tag::add-component[]
import { Kalix } from "@kalix-io/sdk";
import shoppingcartEntity from "./shoppingcart";

new Kalix().addComponent(shoppingcartEntity).start();
// end::add-component[]
