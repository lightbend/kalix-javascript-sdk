
const should = require('chai').should();

describe("The AkkaServerless class", () => {

    it("should allow creating and starting a server", () => {

        // tag::start[]
        const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless;

        const server = new AkkaServerless();
        server.addComponent(require("./shoppingcart"));
        
        server.start();
        // end::start[]

        server.shutdown();
    });

    it("should allow using a custom descriptor name", () => {
        const AkkaServerless = require("@lightbend/akkaserverless-javascript-sdk").AkkaServerless;

        // tag::custom-desc[]
        const server = new AkkaServerless({
            descriptorSetPath: "my-descriptor.desc"
        });
        // end::custom-desc[]

    })
});
