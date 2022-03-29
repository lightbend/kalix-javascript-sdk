
const should = require('chai').should();

describe("The Kalix class", () => {

    it("should allow creating and starting a server", () => {

        // tag::start[]
        const Kalix = require("@lightbend/kalix-javascript-sdk").Kalix;

        const server = new Kalix();
        server.addComponent(require("./shoppingcart"));
        
        server.start();
        // end::start[]

        server.shutdown();
    });

    it("should allow using a custom descriptor name", () => {
        const Kalix = require("@lightbend/kalix-javascript-sdk").Kalix;

        // tag::custom-desc[]
        const server = new Kalix({
            descriptorSetPath: "my-descriptor.desc"
        });
        // end::custom-desc[]

    })
});
