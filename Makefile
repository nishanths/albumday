PROJECT_ID := albumday

.PHONY: deploy
deploy:
	(cd appengine && gcloud --quiet --project $(PROJECT_ID) app deploy)

.PHONY: all
all:
	(cd appengine && make clean build)
	(cd web && make clean build)
