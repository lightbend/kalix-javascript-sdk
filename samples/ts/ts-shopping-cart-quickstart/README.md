# Shopping Cart


## Designing

To understand the Kalix concepts that are the basis for this example, see [designing
services](https://docs.kalix.io/services/development-process.html) in the documentation.


## Developing

This project demonstrates the use of an Event Sourced Entity component to create a Shopping Cart.

To understand more about components, see [developing services](https://docs.kalix.io/services/) and
the [JavaScript section](https://docs.kalix.io/javascript/) in particular.


## Building

You can use `npm` to build your project, which will also take care of generating code based on the
`.proto` definitions. First install dependencies:

```
npm install
```

Then run the `build` script:

```
npm run build
```


## Testing

Unit tests, that test against a mock entity, can be found in `test`. Run the unit tests with:

```
npm test
```

Integration tests, that make calls against a local service, can be found in `integration-test`.
Run the integration tests with:

```
npm run integration-test
```


## Running Locally

To run the example locally, you must run the Kalix Runtime. The included `docker-compose` file
contains the configuration required to run the Runtime for a locally running application. It also
contains the configuration to start a local Google Pub/Sub emulator that the Kalix Runtime will
connect to.

To start the Kalix Runtime, run the following command from this directory:

```shell
docker compose up
```

To start the application locally, use the following command:

```shell
npm start
```

With both the Kalix Runtime and your application running, the defined endpoints should be available at
`http://localhost:9000`. In addition to the defined gRPC interface, each method has a corresponding
HTTP endpoint. Example calls using [grpcurl](https://github.com/fullstorydev/grpcurl):

* Add an item to a cart:
  ```shell
  grpcurl \
    -d '{
      "cart_id": "abc123",
      "product_id": "AAPL",
      "name": "Apples",
      "quantity": 42
    }' \
    --plaintext localhost:9000 \
    shopping.cart.api.ShoppingCart/AddItem
  ```

* Retrieve the cart:
  ```shell
  grpcurl \
    -d '{"cart_id": "abc123"}' \
    --plaintext localhost:9000 \
    shopping.cart.api.ShoppingCart/GetCart
  ```

* Remove an item from the cart:
  ```shell
  grpcurl \
    -d '{
      "cart_id": "abc123",
      "product_id": "AAPL"
    }' \
    --plaintext localhost:9000 \
    shopping.cart.api.ShoppingCart/RemoveItem
  ```


## Deploying

To deploy your service, install the `kalix` CLI as documented in [Install Kalix](https://docs.kalix.io/kalix/install-kalix.html) and configure a Docker Registry to upload your docker image to.

You will need to update the `config.dockerImage` property in the `package.json`. Refer to
[configuring registries](https://docs.kalix.io/projects/container-registries.html) for more
information on how to make your docker image available to Kalix.

Finally, you can use the [Kalix Console](https://console.kalix.io) to create a project and then
deploy your service into the project either by using `npm run deploy`, through the `kalix` CLI, or
via the web interface. When using `npm run deploy`, the deploy script will also conveniently package
and publish your docker image prior to deployment.
