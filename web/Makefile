ESBUILD := npx esbuild --bundle web.main.tsx --outdir=dist --minify --sourcemap

.PHONY: build
build:
	npx tsc # typecheck
	$(ESBUILD) --define:process.env.NODE_ENV='"development"'

.PHONY: build-prod
build-prod:
	npx tsc # typecheck
	$(ESBUILD) --define:process.env.NODE_ENV='"production"'

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
		! -name '*.d.ts' | \
		xargs npx tsfmt --useTsfmt=../tsfmt.json --replace --
