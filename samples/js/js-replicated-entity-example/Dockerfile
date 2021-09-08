FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci && npm run prepare
RUN cd sdk && npm prune --production
COPY samples/js/js-replicated-entity-example/package*.json samples/js/js-replicated-entity-example/
RUN cd samples/js/js-replicated-entity-example && npm ci
COPY samples/js/js-replicated-entity-example samples/js/js-replicated-entity-example
RUN cd samples/js/js-replicated-entity-example && npm run build
RUN cd samples/js/js-replicated-entity-example && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js/js-replicated-entity-example
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
