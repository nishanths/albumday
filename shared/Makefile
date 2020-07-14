.PHONY: build
build:
	npx tsc # emit declarations and type check
	npx esbuild *.ts --outdir=dist --minify --sourcemap

.PHONY: watch
watch:
	@./watch
