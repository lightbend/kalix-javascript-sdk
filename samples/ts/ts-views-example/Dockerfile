FROM node:18-bookworm-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY samples/ts/ts-views-example/package*.json samples/ts/ts-views-example/
RUN cd samples/ts/ts-views-example && npm ci
COPY samples/ts/ts-views-example samples/ts/ts-views-example
RUN cd samples/ts/ts-views-example && npm run build
RUN cd samples/ts/ts-views-example && npm prune --production

FROM node:18-bookworm-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/ts/ts-views-example
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["node", "dist/index.js"]
