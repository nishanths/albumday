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

	(rm -rf redis && mkdir redis)
	(cd redis && ln -sfn ../../redis/tls tls)

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

