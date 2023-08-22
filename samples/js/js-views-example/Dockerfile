FROM node:18-bookworm-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci && npm run prepare
RUN cd sdk && npm prune --production
COPY samples/js/js-views-example/package*.json samples/js/js-views-example/
RUN cd samples/js/js-views-example && npm ci
COPY samples/js/js-views-example samples/js/js-views-example
RUN cd samples/js/js-views-example && npm run build
RUN cd samples/js/js-views-example && npm prune --production

FROM node:18-bookworm-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js/js-views-example
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["node", "index.js"]
