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


import * as proto from "../lib/generated/proto";
import { replies } from "@lightbend/akkaserverless-javascript-sdk";

// tag::entity-class[]
import { EventSourcedEntity } from "@lightbend/akkaserverless-javascript-sdk";

const entity: EventSourcedEntity = new EventSourcedEntity(
    ["shoppingcart.proto", "domain.proto"],
    "example.shoppingcart.ShoppingCartService",
    "shopping-cart",
    {
        snapshotEvery: 100
    }
);
// end::entity-class[]

type Context = EventSourcedEntity.EventSourcedEntityCommandContext;

type State = proto.com.example.shoppingcart.domain.Cart;

type AddLineItem = proto.com.example.shoppingcart.AddLineItem;
type RemoveLineItem = proto.com.example.shoppingcart.RemoveLineItem;
type GetShoppingCart = proto.com.example.shoppingcart.GetShoppingCart;
type ItemAdded = proto.com.example.shoppingcart.domain.ItemAdded;
type ItemRemoved = proto.com.example.shoppingcart.domain.ItemRemoved;

// tag::lookup-type[]
const pkg = "example.shoppingcart.domain.";
const ItemAdded = entity.lookupType(pkg + "ItemAdded");
const ItemRemoved = entity.lookupType(pkg + "ItemRemoved");
const Cart = entity.lookupType(pkg + "Cart");
// end::lookup-type[]

// tag::initial[]
entity.setInitial(entityId => Cart.create({ items: [] }));
// end::initial[]

// tag::get-cart[]
function getCart(request: GetShoppingCart, cart: State): replies.Reply {
    return replies.message(cart);
}
// end::get-cart[]

// tag::add-item[]
function addItem(
    addItem: AddLineItem,
    cart: State,
    ctx: Context
): replies.Reply {
    if (addItem.quantity < 1) {
        return replies.failure(
            "Cannot add negative quantity to item " + addItem.productId
        );
    }

    const itemAdded = ItemAdded.create({
        item: {
            productId: addItem.productId,
            name: addItem.name,
            quantity: addItem.quantity
        }
    });
    ctx.emit(itemAdded);
    return replies.message({});
}
// end::add-item[]

function removeItem(
    removeItem: RemoveLineItem,
    cart: State,
    ctx: Context
): replies.Reply {
    const existing = cart.items.find(item => {
        return item.productId === removeItem.productId;
    });

    if (!existing) {
        return replies.failure("Item " + removeItem.productId + " not in cart");
    }

    const itemRemoved = ItemRemoved.create({
        productId: removeItem.productId
    });
    ctx.emit(itemRemoved);
    return replies.message({});
}

// tag::item-added[]
function itemAdded(added: ItemAdded, cart: State): State {
    const existing = cart.items.find(item => {
        return item.productId === added.item?.productId;
    });

    if (existing) {
        existing.quantity = (existing.quantity || 0) + (added.item?.quantity || 0);
    } else {
        added.item ? cart.items.push(added.item) : {};
    }

    return cart;
}
// end::item-added[]

function itemRemoved(removed: ItemRemoved, cart: State): State {
    cart.items = cart.items.filter(item => {
        return item.productId !== removed.productId;
    });

    return cart;
}

// tag::behavior[]
entity.setBehavior((cart: State) => {
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
});
// end::behavior[]

const CheckedOut = entity.lookupType(pkg + "CheckedOut");

type Checkout = {}
type CheckedOut = {}

// tag::multiple-behaviors[]
function checkout(checkout: Checkout, cart: State, ctx: Context): replies.Reply {
    ctx.emit(CheckedOut.create({}));
    return replies.message({});
}

function checkedOut(checkedOut: CheckedOut, cart: State): State {
    cart.checkedOut = true;
    return cart;
}

function alreadyCheckedOut(): replies.Reply {
    return replies.failure("Cart is already checked out!");
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

// tag::add-entity[]
import { AkkaServerless } from "@lightbend/akkaserverless-javascript-sdk";
import shoppingcartEntity from "./shoppingcart";

new AkkaServerless().addComponent(shoppingcartEntity).start();
// end::add-entity[]
