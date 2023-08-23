FROM node:18-bookworm-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY samples/ts/ts-replicated-entity-example/package*.json samples/ts/ts-replicated-entity-example/
RUN cd samples/ts/ts-replicated-entity-example && npm ci
COPY samples/ts/ts-replicated-entity-example samples/ts/ts-replicated-entity-example
RUN cd samples/ts/ts-replicated-entity-example && npm run build
RUN cd samples/ts/ts-replicated-entity-example && npm prune --production

FROM node:18-bookworm-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/ts/ts-replicated-entity-example
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["node", "dist/index.js"]
