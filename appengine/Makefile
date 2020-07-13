.PHONY: default
default: build

.PHONY: build
build:
	npx tsc

.PHONY: serve
serve:
	node ./dist/app.js

.PHONY: watch
watch: clean
	@./watch

.PHONY: clean
clean:
	rm -rf dist/

.PHONY: all
all: clean build serve

.PHONY: fmt
fmt:
	# tsfmt
	find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
		! -name '*.d.ts' | \
		xargs npx tsfmt --useTsfmt=../tsfmt.json --replace --

