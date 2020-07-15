.PHONY: default
default: build

.PHONY: build
build:
	npx tsc  # only typecheck
	npx esbuild --bundle app.ts --outdir=dist --minify --sourcemap --platform=node

.PHONY: serve
serve:
	node ./dist/app.js

.PHONY: watch
watch: clean
	@./watch

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

