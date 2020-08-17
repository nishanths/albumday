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
	(cd web && make fmt)

.PHONY: deps
deps:
	(cd appengine && make deps)
	(cd web && make deps)

.PHONY: redis
redis:
	${HOME}/src/redis-6.0.5/src/redis-server

.PHONY: redisc
redisc:
	${HOME}/src/redis-6.0.5/src/redis-cli


.PHONY: clean
clean:
	(cd appengine && make clean)
	(cd web && make clean)

.PHONY: deploy-cron
	(cd appengine && gcloud --quiet --project $(PROJECT_ID) app deploy cron.yaml)
