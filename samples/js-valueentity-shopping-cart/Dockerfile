FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci && npm run prepare
RUN cd sdk && npm prune --production
COPY samples/js-valueentity-shopping-cart/package*.json samples/js-valueentity-shopping-cart/
RUN cd samples/js-valueentity-shopping-cart && npm ci
COPY samples/js-valueentity-shopping-cart samples/js-valueentity-shopping-cart
RUN cd samples/js-valueentity-shopping-cart && npm run build
RUN cd samples/js-valueentity-shopping-cart && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js-valueentity-shopping-cart
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
