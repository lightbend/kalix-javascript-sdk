/*
 * Copyright 2021 Lightbend Inc.
 */

// tag::entity-class[]
const ValueEntity = require("@lightbend/kalix-javascript-sdk").ValueEntity;

const entity = new ValueEntity(
  ["shoppingcart.proto", "domain.proto"],
  "example.shoppingcart.ShoppingCartService",
  "shopping-cart"
);
// end::entity-class[]

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
function addItem(addItem, cart, ctx) {
  // Validation:
  // Make sure that it is not possible to add negative quantities
  if (addItem.quantity < 1) {
    ctx.fail(
        "Quantity for item " + addItem.productId + " must be greater than zero.",
        3, // optional parameter, sets the gRPC status code to 3 - INVALID_ARGUMENT
    );
  } else {
    // If there is an existing item with that product id, we need to increment its quantity.
    const existing = cart.items.find(item => {
      return item.productId === addItem.productId;
    });

    if (existing) {
      existing.quantity = existing.quantity + addItem.quantity;
    } else {
      // Otherwise, we just add the item to the existing list.
      cart.items.push(addItem);
    }
    ctx.updateState(cart);
  }
  return {};
}
// end::add-item[]

function removeItem(removeItem, cart, ctx) {
  // Validation:
  // Check that the item that we're removing actually exists.
  const existing = cart.items.find(item => {
    return item.productId === removeItem.productId;
  });

  // If not, fail the command.
  if (!existing) {
    ctx.fail("Item " + removeItem.productId + " not in cart");
  } else {
    // Otherwise, remove the item.

    // Filter the removed item from the items by product id.
    cart.items = cart.items.filter(item => {
      return item.productId !== removed.productId;
    });

    ctx.updateState(cart);
  }
  return {};
}

// tag::get-cart[]
function getCart(request, cart, ctx) {
  return cart;
}
// end::get-cart[]

// Export the entity
module.exports = entity;


describe("The ValueEntity class", () => {
  it("should allow adding the entity to the Kalix server", () => {
    // tag::add-component[]
    const Kalix = require("@lightbend/kalix-javascript-sdk").Kalix;
    const server = new Kalix();
    server.addComponent(entity);
    server.start();
    // end::add-component[]
  })
});
