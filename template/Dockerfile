# This Dockerfile uses multi-stage build process.
# See https://docs.docker.com/develop/develop-images/multistage-build/

# Stage 1: Downloading dependencies and building the application
FROM node:15.9.0-alpine3.13 AS builder

# Set the working directory
WORKDIR /home/node

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build the app
COPY . .
RUN npm run build

# Remove dev packages
# (the rest will be copied to the production image at stage 2)
RUN npm prune --production

# Stage 2: Building the production image
FROM node:15.9.0-alpine3.13

# Set the working directory
WORKDIR /home/node

# Copy dependencies
COPY --from=builder --chown=node /home/node/node_modules node_modules/

# Copy the app
COPY --from=builder --chown=node \
    /home/node/package*.json \
    /home/node/src \
    /home/node/proto \
    /home/node/user-function.desc \
    ./

# Run the app as an unprivileged user for extra security.
USER node

# Run
EXPOSE 8080
CMD ["npm", "start"]