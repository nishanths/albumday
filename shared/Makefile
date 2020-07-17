.PHONY: default
default:
	echo "default target does nothing"

.PHONY: build
build:
	npx tsc

.PHONY: watch
watch:
	$(SHELL) ./watch

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
