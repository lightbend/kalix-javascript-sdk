// tag::start[]
import { Kalix } from "@lightbend/kalix-javascript-sdk";
import shoppingcartEntity from "./shoppingcart";

new Kalix().addComponent(shoppingcartEntity).start();
// end::start[]


// tag::custom-desc[]
new Kalix({ descriptorSetPath: "my-descriptor.desc" });
// end::custom-desc[]
