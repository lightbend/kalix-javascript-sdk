/*
 * Copyright 2021 Lightbend Inc.
 */

const ValueEntity = require("@lightbend/akkaserverless-javascript-sdk").ValueEntity;

const entity = new ValueEntity(
  ["shoppingcart/shoppingcart.proto", "shoppingcart/persistence/domain.proto"],
  "com.example.valueentity.shoppingcart.ShoppingCart",
  {
    persistenceId: "shopping-cart",
    includeDirs: ["../../protocols/example/valueentity"]
  }
);

/*
 * Here we load the Protobuf types. When setting state, we need to return
 * protobuf message objects, not just ordinary JavaScript objects, so that the framework can
 * know how to serialize these objects when they are persisted.
 *
 * Note this shows loading them dynamically, they could also be compiled and statically loaded.
 */
const pkg = "com.example.shoppingcart.persistence.";
const Cart = entity.lookupType(pkg + "Cart");


/*
 * Set a callback to create the initial state. This is what is created if there is no
 * snapshot to load.
 *
 * We can ignore the userId parameter if we want, it's the id of the entity, which is
 * automatically associated with all events and state for this entity.
 */
entity.setInitial(userId => Cart.create({items: []}));

/*
 * Command handlers. The name of the command corresponds to the name of the rpc call in
 * the gRPC service that this entity offers.
 */
entity.setCommandHandlers({
  AddItem: addItem,
  RemoveItem: removeItem,
  GetCart: getCart
});

/**
 * Handler for add item commands.
 */
function addItem(addItem, cart, ctx) {
  // Validation:
  // Make sure that it is not possible to add negative quantities
  if (addItem.quantity < 1) {
    ctx.fail("Cannot add negative quantity to item " + addItem.productId);
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

/**
 * Handler for remove item commands.
 */
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

/**
 * Handler for get cart commands.
 */
function getCart(request, cart, ctx) {
  // Simply return the shopping cart as is.
  return cart;
}

// Export the entity
module.exports = entity;
