PROJECT_ID := albumday

.PHONY: all
all:
	(cd appengine-go && make clean build)
	(cd web && make clean build-prod)

.PHONY: deploy
deploy:
	(cd appengine-go && gcloud --quiet --project $(PROJECT_ID) app deploy --version v1)
	make deployed-hash

GIT_STATUS := $(shell git status --short)
COMMIT_HASH := $(shell git rev-list HEAD | head -n 1)
DIRTY := \(dirty\)
ifeq ($(GIT_STATUS),)
DIRTY := ""
endif

.PHONY: deployed-hash
deployed-hash:
	echo $(COMMIT_HASH) $(DIRTY) >> deployed-hash.txt

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

.PHONY: watchgo
watchgo:
	(cd appengine-go && make watch)

.PHONY: watchweb
watchweb:
	(cd web && make watch)
