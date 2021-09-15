FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci && npm run prepare
RUN cd sdk && npm prune --production
COPY samples/js/js-customer-registry/package*.json samples/js/js-customer-registry/
RUN cd samples/js/js-customer-registry && npm ci
COPY samples/js/js-customer-registry samples/js/js-customer-registry
RUN cd samples/js/js-customer-registry && npm run build
RUN cd samples/js/js-customer-registry && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js/js-customer-registry
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["node", "index.js"]
