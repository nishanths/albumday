ESBUILD := npx esbuild --bundle web.main.tsx --outdir=dist/js --minify --sourcemap
SCSS := npx sass scss/main.scss dist/css/main.css

.PHONY: build
build:
	npx tsc # typecheck
	$(ESBUILD) --define:process.env.NODE_ENV='"development"'
	$(SCSS)

.PHONY: build-prod
build-prod:
	npx tsc # typecheck
	$(ESBUILD) --define:process.env.NODE_ENV='"production"'
	$(SCSS)

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
