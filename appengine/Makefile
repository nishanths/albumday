.PHONY: watch
watch: clean
	@./watch

.PHONY: build
build:
	npx tsc

	@# link web/ files
	(cd static && rm -rf dist && mkdir dist)
	(cd static/dist && ln -sfn ../../../web/dist/js js)
	(cd static/dist && ln -sfn ../../../web/dist/css css)

.PHONY: serve
serve:
	node ./dist/app.js

.PHONY: clean
clean:
	rm -rf dist/

.PHONY: fmt
fmt:
	# tsfmt
	find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
		! -name '*.d.ts' \
		! -regex '.*/node_modules/.*' | \
		xargs npx tsfmt --useTsfmt=../tsfmt.json --replace --

.PHONY: deps
deps:
	npm i
