const akkaserverless = require("@lightbend/akkaserverless-javascript-sdk");
const entity = new akkaserverless.EventSourcedEntity("shoppingcart.proto", "example.ShoppingCartService", "shopping-cart");
entity.setInitial(() => {});
entity.setBehavior(() => {
    return {
        commandHandlers: {},
        eventHandlers: {}
    };
});
module.exports = entity;
