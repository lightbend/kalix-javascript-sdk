FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci
RUN cd sdk && npm prune --production
COPY samples/js-eventsourced-shopping-cart/package*.json samples/js-eventsourced-shopping-cart/
RUN cd samples/js-eventsourced-shopping-cart && npm ci
COPY samples/js-eventsourced-shopping-cart samples/js-eventsourced-shopping-cart
RUN cd samples/js-eventsourced-shopping-cart && npm run build
RUN cd samples/js-eventsourced-shopping-cart && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js-eventsourced-shopping-cart
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
