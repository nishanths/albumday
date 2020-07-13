.PHONY: default
default: build

.PHONY: build
build:
	npx tsc # esbuild doesn't typecheck TypeScript, so run tsc without emitting
	npx esbuild --bundle web.main.tsx --outdir=dist --minify --sourcemap

.PHONY: watch
watch:
	@./watch

.PHONY: all
all: clean build

.PHONY: clean
clean:
	rm -rf dist/

.PHONY: fmt
fmt:
	# tsfmt
	find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
		! -name '*.d.ts' | \
		xargs npx tsfmt --useTsfmt=../tsfmt.json --replace --
