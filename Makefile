PROJECT_ID := albumday

.PHONY: all
all:
	(cd appengine && make clean build)
	(cd web && make clean build-prod)

.PHONY: deploy
deploy:
	(cd appengine && gcloud --quiet --project $(PROJECT_ID) app deploy)


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
