FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY samples/ts/ts-customer-registry/package*.json samples/ts/ts-customer-registry/
RUN cd samples/ts/ts-customer-registry && npm ci
COPY samples/ts/ts-customer-registry samples/ts/ts-customer-registry
RUN cd samples/ts/ts-customer-registry && npm run build
RUN cd samples/ts/ts-customer-registry && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/ts/ts-customer-registry
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
