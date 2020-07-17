SRCFILES := *.ts

.PHONY: build
build:
	npx tsc # emit declarations and type check
	npx esbuild --bundle $(SRCFILES) --outdir=dist --minify --sourcemap

.PHONY: watch
watch:
	@./watch

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

.PHONY: clean
clean:
	rm -rf dist
