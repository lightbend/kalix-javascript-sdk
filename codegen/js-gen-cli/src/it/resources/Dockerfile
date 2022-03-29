FROM node:16.1-buster

WORKDIR /home
ADD ./kalix-npm-js kalix-npm-js
ADD ./kalix-codegen-js kalix-codegen-js
ADD ./scripts scripts

# Configure and install tooling
RUN ./scripts/setup.sh

CMD ./scripts/entrypoint.sh
