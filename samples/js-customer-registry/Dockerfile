FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci
RUN cd sdk && npm prune --production
COPY samples/js-customer-registry/package*.json samples/js-customer-registry/
RUN cd samples/js-customer-registry && npm ci
COPY samples/js-customer-registry samples/js-customer-registry
RUN cd samples/js-customer-registry && npm run build
RUN cd samples/js-customer-registry && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js-customer-registry
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
