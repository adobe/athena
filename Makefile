.PHONY: build-docker-dashboard build-docker-core

build-docker-dashboard:
	./deploy/scripts/docker_build_dashboard.sh

build-docker-core:
	./deploy/scripts/docker_build_core.sh