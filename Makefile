PROJECT_ID := albumday

.PHONY: all
all:
	(cd appengine-go && make clean build)
	(cd web && make clean build-prod)

.PHONY: deploy
deploy:
	(cd appengine-go && gcloud --quiet --project $(PROJECT_ID) app deploy --version v1)

.PHONY: fmt
fmt:
	(cd appengine-go && make fmt)
	(cd web && make fmt)

.PHONY: deps
deps:
	(cd web && make deps)

.PHONY: redis
redis:
	${HOME}/src/redis-6.0.5/src/redis-server

.PHONY: redisc
redisc:
	${HOME}/src/redis-6.0.5/src/redis-cli

.PHONY: clean
clean:
	(cd appengine-go && make clean)
	(cd web && make clean)

.PHONY: deploy-cron
deploy-cron:
	(cd appengine-go && gcloud --quiet --project $(PROJECT_ID) app deploy cron.yaml)

.PHONY: deploy-queue
deploy-queue:
	(cd appengine-go && gcloud --quiet --project $(PROJECT_ID) app deploy queue.yaml)

.PHONY: ssh
ssh:
	gcloud beta compute ssh --zone "us-central1-a" "quantum" --project "albumday"
