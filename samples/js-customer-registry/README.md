# Customer Registry example

This example includes the code snippets that are used in the Views documentation.

## Running locally

Install dependencies:

```
npm install
```

Start the Customer Registry example:

```
npm start
```

Start the proxy:

```
docker run --rm -e USER_FUNCTION_HOST=host.docker.internal -p 9000:9000 gcr.io/akkaserverless-public/akkaserverless-proxy
```

Create a customer:

```
grpcurl --plaintext -d '{"customer_id": "vip", "email": "vip@example.com", "name": "Very Important", "address": {"street": "Road 1", "city": "The Capital"}}' localhost:9000  customer.api.CustomerService/Create
```

Retrieve a customer:

```
grpcurl --plaintext -d '{"customer_id": "vip"}' localhost:9000  customer.api.CustomerService/GetCustomer
```

Query customers by name:

```
grpcurl --plaintext -d '{"customer_name": "Very Important"}' localhost:9000 customer.view.CustomersResponseByName/GetCustomers
```

Change name of a customer:

```
grpcurl --plaintext -d '{"customer_id": "vip", "new_name": "Most Important"}' localhost:9000  customer.api.CustomerService/ChangeName
```


## Running integration tests

```
npm run integration-test
```
