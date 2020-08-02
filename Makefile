PROJECT_ID := albumday

.PHONY: all
all:
	(cd shared && make clean build)
	(cd appengine && make clean build)
	(cd web && make clean build-prod)

.PHONY: deploy
deploy:
	$(MAKE) deploy-prepare
	(cd appengine && gcloud --quiet --project $(PROJECT_ID) app deploy)
	$(MAKE) deploy-cleanup

.PHONY: fmt
fmt:
	(cd appengine && make fmt)
	(cd shared && make fmt)
	(cd web && make fmt)

.PHONY: deps
deps:
	(cd shared && make deps)
	(cd appengine && make deps)
	(cd web && make deps)

.PHONY: redis
redis:
	${HOME}/src/redis-6.0.5/src/redis-server

.PHONY: redisc
redisc:
	${HOME}/src/redis-6.0.5/src/redis-cli

.PHONY: deploy-prepare
deploy-prepare:
	# copy package to appengine directory (symlink suffices)
	(cd appengine && ln -s ../shared tmp-shared)
	# rewrite import value in package.json
	sed -i '' 's/file:\.\.\/shared/file:.\/tmp-shared/g' appengine/package.json
	# update package-lock.json correspondingly
	(cd appengine && npm i --package-lock-only)

.PHONY: deploy-cleanup
deploy-cleanup:
	# undo package.json,package-lock.json change
	sed -i '' 's/file:\.\/tmp-shared/file:..\/shared/g' appengine/package.json
	(cd appengine && npm i --package-lock-only)
	# remove copied package
	rm -f appengine/tmp-shared

.PHONY: clean
clean:
	(cd shared && make clean)
	(cd appengine && make clean)
	(cd web && make clean)
