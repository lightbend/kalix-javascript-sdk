# Shopping Cart example (using a Value Entity)

## Running locally

Install dependencies:

```
npm install
```

Start the Shopping Cart example:

```
npm start
```

Start the proxy:

```
docker run --rm -e USER_FUNCTION_HOST=host.docker.internal -p 9000:9000 gcr.io/akkaserverless-public/akkaserverless-proxy
```

Send an `AddItem` command:

```
grpcurl --plaintext -d '{"cart_id": "cart1", "product_id": "akka-tshirt", "name": "Akka T-shirt", "quantity": 3}' localhost:9000 com.example.valueentity.shoppingcart.ShoppingCartService/AddItem
```

Send a `GetCart` command:

```
grpcurl --plaintext -d '{"cart_id": "cart1"}' localhost:9000 com.example.valueentity.shoppingcart.ShoppingCartService/GetCart
```

Send a `RemoveItem` command:

```
grpcurl --plaintext -d '{"cart_id": "cart1", "product_id": "akka-tshirt"}' localhost:9000 com.example.valueentity.shoppingcart.ShoppingCartService/RemoveItem
```

Send a `RemoveCart` command:

```
grpcurl --plaintext -d '{"cart_id": "cart1"}' localhost:9000 com.example.valueentity.shoppingcart.ShoppingCartService/RemoveCart
```


## Running tests

```
npm test
```


## Running integration tests

```
npm run integration-test
```
