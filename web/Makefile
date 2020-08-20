ESBUILD := npx esbuild --bundle web.main.tsx --outdir=dist/js --sourcemap
SCSS := npx sass --source-map --embed-sources scss/main.scss dist/css/main.css

.PHONY: watch
watch: clean
	@./watch

.PHONY: build
build:
	$(SCSS)
	$(ESBUILD) --define:process.env.NODE_ENV='"development"'
	npx tsc # typecheck
	@echo "...done"

.PHONY: build-prod
build-prod:
	$(SCSS) --style=compressed
	$(ESBUILD) --target=es6 --strict --minify --define:process.env.NODE_ENV='"production"'
	npx tsc # typecheck

.PHONY: clean
clean:
	rm -rf dist/

.PHONY: fmt
fmt:
	@find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
		! -name '*.d.ts' \
		! -regex '.*/node_modules/.*' | \
		xargs npx tsfmt --useTsfmt=tsfmt.json --replace --

.PHONY: deps
deps:
	npm i
