FROM node:12

# Copy and install deps. This is done as a separate step as an optimization, so changes to the programs files
# don't require the npm install to be redone
RUN mkdir -p /opt/samples/js-replicated-entity-example
RUN mkdir -p /opt/protocols/example
COPY javascript-sdk /opt/javascript-sdk
COPY samples/js-replicated-entity-example/package.json /opt/samples/js-replicated-entity-example/
RUN cd /opt/javascript-sdk && npm install && cd /opt/samples/js-replicated-entity-example && npm install

# Now copy the entire app
COPY samples/js-replicated-entity-example /opt/samples/js-replicated-entity-example
COPY protocols/example /opt/protocols/example
WORKDIR /opt/samples/js-replicated-entity-example
RUN npm run prestart

# run
EXPOSE 8080
ENV DEBUG=akkaserverless*
ENTRYPOINT ["npm", "run", "start-no-prestart"]
