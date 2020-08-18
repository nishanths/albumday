BINARY := main

.PHONY: watch
watch: clean
	@./watch # source for env vars forwarding


.PHONY: build
build:
	go build -o $(BINARY)

	@# link web/ files
	(cd static && rm -rf dist && mkdir dist)
	(cd static/dist && ln -sfn ../../../web/dist/js js)
	(cd static/dist && ln -sfn ../../../web/dist/css css)

.PHONY: fmt
fmt:
	goimports -w ./
	exhaustive ./...

.PHONY: serve
serve:
	./$(BINARY)

.PHONY: clean
clean:
	rm -f $(BINARY)

