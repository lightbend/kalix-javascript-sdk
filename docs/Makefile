# Make Akka Serverless JavaScript SDK documentation

module   := js-services
upstream := lightbend/akkaserverless-javascript-sdk
branch   := docs/current
sources  := src build/src/managed

src_managed := build/src/managed
managed_attachments := ${src_managed}/modules/${module}/attachments
managed_examples := ${src_managed}/modules/${module}/examples
managed_partials := ${src_managed}/modules/${module}/partials

.SILENT:

build: clean managed

clean:
	rm -rf build

managed: attributes apidocs examples
	mkdir -p "${src_managed}"
	cp src/antora.yml "${src_managed}/antora.yml"

attributes:
	mkdir -p "${managed_partials}"
	bin/version.sh | xargs -0  printf ":akkaserverless-javascript-sdk-version: %s" \
		> "${managed_partials}/attributes.adoc"
	echo ":minimum_node_version: 14" \
		>> "${managed_partials}/attributes.adoc"

apidocs:
	cd ../sdk && npm ci && npm run jsdoc
	mkdir -p "${managed_attachments}"
	rsync -a ../sdk/apidocs/ "${managed_attachments}/api/"

examples:
	mkdir -p "${managed_examples}"
	rsync -a --exclude-from=.examplesignore ../samples/js-customer-registry/ "${managed_examples}/js-customer-registry/"
	rsync -a --exclude-from=.examplesignore ../samples/valueentity-counter/ "${managed_examples}/valueentity-counter/"

deploy: clean managed
	bin/deploy.sh --module ${module} --upstream ${upstream} --branch ${branch} ${sources}
