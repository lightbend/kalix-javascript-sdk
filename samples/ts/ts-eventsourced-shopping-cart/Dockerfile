# This Dockerfile uses multi-stage build process.
# See https://docs.docker.com/develop/develop-images/multistage-build/

# Stage 1: Downloading dependencies and building the application
FROM node:14.19-buster-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /home/node

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build the app
COPY --chown=node . .
RUN npm run build

# Remove dev packages
# (the rest will be copied to the production image at stage 2)
RUN npm prune --production

# Stage 2: Building the production image
FROM node:14.19-buster-slim

# Set the working directory
WORKDIR /home/node

# Copy dependencies
COPY --from=builder --chown=node /home/node/node_modules node_modules/

# Copy the app
COPY --from=builder --chown=node \
    /home/node/package*.json \
    /home/node/user-function.desc \
    ./
COPY --from=builder --chown=node /home/node/proto ./proto
COPY --from=builder --chown=node /home/node/dist ./dist
COPY --from=builder --chown=node /home/node/lib ./lib

# Run the app as an unprivileged user for extra security.
USER node

# Run
EXPOSE 8080
# Call node directly to get SIGTERM for graceful shutdown
CMD ["node", "dist/index.js"]
