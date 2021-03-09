
const should = require('chai').should();

describe("The AkkaServerless class", () => {

    it("should allow creating and starting a server", () => {

        // tag::start[]
        const akkaserverless = require("@lightbend/akkaserverless-javascript-sdk");
        const shoppingcart = require("./shoppingcart");

        const server = new akkaserverless.AkkaServerless();
        server.addComponent(shoppingcart);
        server.start();
        // end::start[]

        server.shutdown();
    });

    it("should allow using a custom descriptor name", () => {
        const akkaserverless = require("@lightbend/akkaserverless-javascript-sdk");

        // tag::custom-desc[]
        const server = new akkaserverless.AkkaServerless({
            descriptorSetPath: "my-descriptor.desc"
        });
        // end::custom-desc[]

    })
});
