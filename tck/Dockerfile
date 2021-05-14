FROM node:14-buster-slim AS builder
WORKDIR /home/node
RUN apt-get update && apt-get install -y curl unzip
COPY sdk sdk
RUN cd sdk && npm ci
RUN cd sdk && npm prune --production
COPY tck/package*.json tck/
RUN cd tck && npm ci
COPY tck tck
RUN cd tck && npm run build
RUN cd tck && npm prune --production

FROM node:14-buster-slim
COPY --from=builder --chown=node /home/node /home/node
WORKDIR /home/node/tck
USER node
ENV HOST 0.0.0.0
ENV NODE_ENV production
ENV DEBUG akkaserverless*
EXPOSE 8080
CMD ["npm", "start"]
