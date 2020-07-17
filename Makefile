PROJECT_ID := albumday

.PHONY: all
all:
	(cd server && make clean build)
	(cd web && make clean build-prod)
	(cd server/static && rm -rf dist && mkdir dist)
	(cd server/static/dist && ln -sfn ../../../web/dist/js js)
	(cd server/static/dist && ln -sfn ../../../web/dist/css css)

.PHONY: deploy
deploy:
	(cd server && gcloud --quiet --project $(PROJECT_ID) app deploy)


.PHONY: fmt
fmt:
	(cd server && make fmt)
	(cd shared && make fmt)
	(cd web && make fmt)

.PHONY: deps
	(cd shared && make deps)
	(cd server && make deps)
	(cd web && make deps)
