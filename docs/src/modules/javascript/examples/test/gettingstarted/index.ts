// tag::start[]
import { AkkaServerless } from "@lightbend/akkaserverless-javascript-sdk";
import shoppingcartEntity from "./shoppingcart";

new AkkaServerless().addComponent(shoppingcartEntity).start();
// end::start[]


// tag::custom-desc[]
new AkkaServerless({ descriptorSetPath: "my-descriptor.desc" });
// end::custom-desc[]
