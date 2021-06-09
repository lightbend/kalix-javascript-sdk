# Publishing

The samples are published as Docker images to `grc.io/akkaserverless-public`.

To publish the images, ensure that you have the right permissions and configure `gcloud` to connect

```shell
# needs to be done if not logged in
gcloud auth login 
# needs to be done once
gcloud auth configure-docker 
```

```shell
# build the docker image
npm run package
```

```shell
# push it to docker registry
docker push gcr.io/akkaserverless-public/samples-js-event-sourced-entity-shopping-cart:0.0.1
```
