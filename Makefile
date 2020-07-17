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

.PHONY: deploy-prepare
deploy-prepare:
	# copy package to appengine directory
	cp -r shared appengine/tmp-deploy-package-shared
	# preserve copy of original package.json,package-lock.json
	cp appengine/package.json appengine/package.json.original
	cp appengine/package-lock.json appengine/package-lock.json.original
	# rewrite import value in package.json
	sed -i '' 's/file:..\/shared/file:.\/tmp-deploy-package-shared/g' appengine/package.json
	# update package-lock.json correspondingly
	(cd appengine && npm i --package-lock-only)

.PHONY: deploy-cleanup
deploy-cleanup:
	# undo package.json,package-lock.json change
	mv appengine/package.json.original appengine/package.json
	mv appengine/package-lock.json.original appengine/package-lock.json
	# remove copied package
	rm -rf appengine/tmp-deploy-package-shared
