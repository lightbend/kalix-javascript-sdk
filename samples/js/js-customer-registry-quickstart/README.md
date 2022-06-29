# Quickstart project: Customer Registry


## Designing

To understand the Kalix concepts that are the basis for this example, see [designing
services](https://docs.kalix.io/services/development-process.html) in the documentation.


## Developing

This project demonstrates the use of a Value Entity component to create a Customer Registry.

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

To run the example locally, you must run the Kalix proxy. The included `docker-compose` file
contains the configuration required to run the proxy for a locally running application. It also
contains the configuration to start a local Google Pub/Sub emulator that the Kalix proxy will
connect to. To start the proxy, run the following command from this directory:

```
docker-compose up
```

To start the application locally, use the following command:

```
npm start
```

With both the proxy and your application running, the defined endpoints should be available at
`http://localhost:9000`. In addition to the defined gRPC interface, each method has a corresponding
HTTP endpoint. Example calls using [grpcurl](https://github.com/fullstorydev/grpcurl):

* Create a customer:
  ```
  grpcurl \
    -d '{
      "customer_id": "abc123",
      "email": "someone@example.com",
      "name": "Someone",
      "address": {
        "street": "123 Some Street",
        "city": "Somewhere"
      }
    }' \
    --plaintext localhost:9000 \
    customer.api.CustomerService/Create
  ```

* Retrieve the customer:
  ```
  grpcurl \
    -d '{"customer_id": "abc123"}' \
    --plaintext localhost:9000 \
    customer.api.CustomerService/GetCustomer
  ```

* Change the customer's name:
  ```
  grpcurl \
    -d '{
      "customer_id": "abc123",
      "new_name": "New Someone"
    }' \
    --plaintext localhost:9000 \
    customer.api.CustomerService/ChangeName
  ```

* Change the customer's address:
  ```
  grpcurl \
    -d '{
      "customer_id": "abc123",
      "new_address": {
        "street": "42 Some New Street",
        "city": "New Somewhere"
      }
    }' \
    --plaintext localhost:9000 \
    customer.api.CustomerService/ChangeAddress
  ```


## Deploying

To deploy your service, install the `kalix` CLI as documented in [setting up a local development
environment](https://docs.kalix.io/getting-started/set-up-development-env.html) and configure a
Docker Registry to upload your docker image to.

You will need to update the `config.dockerImage` property in the `package.json`. Refer to
[configuring registries](https://docs.kalix.io/projects/container-registries.html) for more
information on how to make your docker image available to Kalix.

Finally, you can use the [Kalix Console](https://console.kalix.io) to create a project and then
deploy your service into the project either by using `npm run deploy`, through the `kalix` CLI, or
via the web interface. When using `npm run deploy`, the deploy script will also conveniently package
and publish your docker image prior to deployment.
