/*
 * Copyright 2019 Lightbend Inc.
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

// tag::entity-class[]
const EventSourcedEntity = require("@lightbend/kalix-javascript-sdk").EventSourcedEntity;

const entity = new EventSourcedEntity(
    ["shoppingcart.proto", "domain.proto"],
    "example.shoppingcart.ShoppingCartService",
    {
        persistenceId: "shopping-cart",
        snapshotEvery: 100
    }
);
// end::entity-class[]

// tag::lookup-type[]
const pkg = "example.shoppingcart.domain.";
const ItemAdded = entity.lookupType(pkg + "ItemAdded");
const ItemRemoved = entity.lookupType(pkg + "ItemRemoved");
const Cart = entity.lookupType(pkg + "Cart");
// end::lookup-type[]

// tag::initial[]
entity.initial = entityId => Cart.create({ items: [] });
// end::initial[]

// tag::get-cart[]
function getCart(request, cart) {
    return cart;
}
// end::get-cart[]

// tag::add-item[]
function addItem(addItem, cart, ctx) {
    if (addItem.quantity < 1) {
        ctx.fail(
            "Quantity for item " + addItem.productId + " must be greater than zero.",
            3, // optional parameter, sets the gRPC status code to 3 - INVALID_ARGUMENT
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
        return {};
    }
}
// end::add-item[]

function removeItem() {}

// tag::item-added[]
function itemAdded(added, cart) {
    const existing = cart.items.find(item => {
        return item.productId === added.item.productId;
    });

    if (existing) {
        existing.quantity = existing.quantity + added.item.quantity;
    } else {
        cart.items.push(added.item);
    }

    return cart;
}
// end::item-added[]

function itemRemoved() {}

// tag::behavior[]
entity.behavior = cart => {
    return {
        commandHandlers: {
            AddItem: addItem,
            RemoveItem: removeItem,
            GetCart: getCart
        },
        eventHandlers: {
            ItemAdded: itemAdded,
            ItemRemoved: itemRemoved
        }
    };
};
// end::behavior[]

const CheckedOut = entity.lookupType(pkg + "CheckedOut");

// tag::multiple-behaviors[]
function checkout(checkout, cart, ctx) {
    ctx.emit(CheckedOut.create({}));
    return {};
}

function checkedOut(checkedOut, cart) {
    cart.checkedOut = true;
    return cart;
}

function alreadyCheckedOut(cmd, state, ctx) {
    ctx.fail("Cart is already checked out!");
}

entity.behavior = cart => {
    if (cart.checkedout) {
        return {
            commandHandlers: {
                AddItem: alreadyCheckedOut,
                RemoveItem: alreadyCheckedOut,
                Checkout: alreadyCheckedOut,
                GetCart: getCart
            },
            eventHandlers : {}
        };
    } else {
        return {
            commandHandlers: {
                AddItem: addItem,
                RemoveItem: removeItem,
                Checkout: checkout,
                GetCart: getCart
            },
            eventHandlers: {
                ItemAdded: itemAdded,
                ItemRemoved: itemRemoved,
                CheckedOut: checkedOut
            }
        };
    }
};
// end::multiple-behaviors[]

describe("The Eventsourced class", () => {
    it("should allow adding the entity to the gRPC server", () => {
        // tag::add-entity[]
        const Kalix = require("@lightbend/kalix-javascript-sdk").Kalix;

        const server = new Kalix();
        server.addComponent(require("./shoppingcart"));
        
        server.start();
        // end::add-entity[]
    })
});
