.PHONY: watch
watch: clean
	@./watch

.PHONY: build
build:
	npx tsc

.PHONY: fmt
fmt:
	@find . -type f \( -name '*.ts' -o -name '*.tsx' \) \
		! -name '*.d.ts' \
		! -regex '.*/node_modules/.*' | \
		xargs npx tsfmt --useTsfmt=../tsfmt.json --replace --

.PHONY: deps
deps:
	npm i

.PHONY: clean
clean:
	rm -rf dist
