FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci
RUN cd sdk && npm prune --production
COPY samples/js-views-example/package*.json samples/js-views-example/
RUN cd samples/js-views-example && npm ci
COPY samples/js-views-example samples/js-views-example
RUN cd samples/js-views-example && npm run build
RUN cd samples/js-views-example && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/samples/js-views-example
USER node
ENV NODE_ENV production
EXPOSE 8080
CMD ["npm", "run", "start-no-prestart"]
