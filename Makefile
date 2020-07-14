PROJECT_ID := albumday

.PHONY: all
all:
	(cd appengine && make clean build)
	(cd web && make clean build-prod)
	(cd appengine/static && rm -rf dist && mkdir dist)
	(cd appengine/static/dist && ln -sfn ../../../web/dist/js js)
	(cd appengine/static/dist && ln -sfn ../../../web/dist/css css)

.PHONY: deploy
deploy:
	(cd appengine && gcloud --quiet --project $(PROJECT_ID) app deploy)


.PHONY: fmt
fmt:
	(cd appengine && make fmt)
	(cd shared && make fmt)
	(cd web && make fmt)
