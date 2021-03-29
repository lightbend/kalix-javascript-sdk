const akkaserverless = require("@lightbend/akkaserverless-javascript-sdk");
const entity = new akkaserverless.EventSourced("shoppingcart.proto", "example.ShoppingCartService", "shopping-cart");
entity.setInitial(() => {});
entity.setBehavior(() => {
    return {
        commandHandlers: {},
        eventHandlers: {}
    };
});
module.exports = entity;
