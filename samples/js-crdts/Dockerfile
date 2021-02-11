FROM node:12

# Copy and install deps. This is done as a separate step as an optimization, so changes to the programs files
# don't require the npm install to be redone
RUN mkdir -p /opt/samples/js-crdts
RUN mkdir -p /opt/protocols/example
COPY javascript-sdk /opt/javascript-sdk
COPY samples/js-crdts/package.json /opt/samples/js-crdts/
RUN cd /opt/javascript-sdk && npm install && cd /opt/samples/js-crdts && npm install

# Now copy the entire app
COPY samples/js-crdts /opt/samples/js-crdts
COPY protocols/example /opt/protocols/example
WORKDIR /opt/samples/js-crdts
RUN npm run prestart

# run
EXPOSE 8080
ENV DEBUG=akkaserverless*
ENTRYPOINT ["npm", "run", "start-no-prestart"]
