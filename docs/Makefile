# Make Kalix JavaScript SDK SDK documentation

module   := javascript
upstream := lightbend/kalix-javascript-sdk
branch   := docs/current
sources  := src build/src/managed

src_managed := build/src/managed
managed_attachments := ${src_managed}/modules/${module}/attachments
managed_examples := ${src_managed}/modules/${module}/examples
managed_partials := ${src_managed}/modules/${module}/partials

antora_docker_image := gcr.io/akkaserverless-public/akkaserverless-docbuilder
antora_docker_image_tag := 0.0.5
root_dir := $(shell git rev-parse --show-toplevel)
base_path := $(shell git rev-parse --show-prefix)

.SILENT:

build: dev

clean:
	rm -rf build

managed: attributes apidocs examples bundles
	mkdir -p "${src_managed}"
	cp src/antora.yml "${src_managed}/antora.yml"

attributes:
	mkdir -p "${managed_partials}"
	bin/version.sh | xargs -0  printf ":kalix-javascript-sdk-version: %s" \
		> "${managed_partials}/attributes.adoc"
	echo ":minimum_node_version: 14" \
		>> "${managed_partials}/attributes.adoc"
	echo ":javascript_minimum_sdk_version: 0.31.0" \
		>> "${managed_partials}/attributes.adoc"

apidocs:
	cd ../sdk && npm ci && npm run jsdoc
	mkdir -p "${managed_attachments}"
	rsync -a ../sdk/apidocs/ "${managed_attachments}/api/"

examples:
	mkdir -p "${managed_examples}"
	rsync -a --exclude-from=.examplesignore ../samples/js/js-doc-snippets/ "${managed_examples}/js-doc-snippets/"
	rsync -a --exclude-from=.examplesignore ../samples/js/js-customer-registry/ "${managed_examples}/js-customer-registry/"
	rsync -a --exclude-from=.examplesignore ../samples/js/js-valueentity-shopping-cart/ "${managed_examples}/js-valueentity-shopping-cart/"
	rsync -a --exclude-from=.examplesignore ../samples/js/valueentity-counter/ "${managed_examples}/valueentity-counter/"
	rsync -a --exclude-from=.examplesignore ../samples/js/js-eventsourced-shopping-cart/ "${managed_examples}/js-eventsourced-shopping-cart/"
	rsync -a --exclude-from=.examplesignore ../samples/js/js-replicated-entity-shopping-cart/ "${managed_examples}/js-replicated-entity-shopping-cart/"
	rsync -a --exclude-from=.examplesignore ../samples/ts/ts-customer-registry/ "${managed_examples}/ts-customer-registry/"
	rsync -a --exclude-from=.examplesignore ../samples/ts/ts-valueentity-shopping-cart/ "${managed_examples}/ts-valueentity-shopping-cart/"
	rsync -a --exclude-from=.examplesignore ../samples/ts/ts-valueentity-counter/ "${managed_examples}/ts-valueentity-counter/"
	rsync -a --exclude-from=.examplesignore ../samples/ts/ts-eventsourced-shopping-cart/ "${managed_examples}/ts-eventsourced-shopping-cart/"
	rsync -a --exclude-from=.examplesignore ../samples/ts/ts-replicated-entity-shopping-cart/ "${managed_examples}/ts-replicated-entity-shopping-cart/"

bundles:
	bin/bundle.sh --zip "${managed_attachments}/js-customer-registry-quickstart.zip" ../samples/js/js-customer-registry
	bin/bundle.sh --zip "${managed_attachments}/ts-customer-registry-quickstart.zip" ../samples/ts/ts-customer-registry
	bin/bundle.sh --zip "${managed_attachments}/js-eventsourced-shopping-cart.zip" ../samples/js/js-eventsourced-shopping-cart
	bin/bundle.sh --zip "${managed_attachments}/ts-eventsourced-shopping-cart.zip" ../samples/ts/ts-eventsourced-shopping-cart

dev: clean managed validate-xrefs dev-html

dev-html:
	docker run \
		-v ${root_dir}:/antora \
		--rm \
		--entrypoint /bin/sh \
		-t ${antora_docker_image}:${antora_docker_image_tag} \
		-c "cd /antora/${base_path} && antora --cache-dir=.cache/antora --stacktrace --log-failure-level=warn dev/antora.yml"
	@echo "Generated docs at dev/build/site/javascript/index.html"

validate-xrefs:
	docker run \
		-v ${root_dir}:/antora \
		--rm \
		--entrypoint /bin/sh \
		-t ${antora_docker_image}:${antora_docker_image_tag} \
		-c 'cd /antora/${base_path} && NODE_PATH="$$(npm -g root)" antora --generator @antora/xref-validator dev/antora.yml'

validate-links:
	docker run \
		-v ${root_dir}:/antora \
		--rm \
		--entrypoint /bin/sh \
		-t ${antora_docker_image}:${antora_docker_image_tag} \
		-c "cd /antora/${base_path} && find src -name '*.adoc' -print0 | xargs -0 -n1 asciidoc-link-check --progress --config config/validate-links.json"

deploy: clean managed
	bin/deploy.sh --module ${module} --upstream ${upstream} --branch ${branch} ${sources}
