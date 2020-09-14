#!/bin/bash

set -x
set -euo pipefail

# Prep
PUBLISH=${1:-false}
VERSION=$(cat package.json | grep version  | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')
DOCKER_REPO=docker2-api-platform-snapshot-local.dr-uw2.adobeitc.com
DOCKER_IMAGE_NAME=apiplatform/athena
DOCKER_IMAGE=$DOCKER_IMAGE_NAME:$VERSION
DOCKER_IMAGE_LATEST=$DOCKER_IMAGE_NAME:latest

# Build
docker build -f ./deploy/docker/core.Dockerfile -t $DOCKER_IMAGE_NAME .

# Tag
# docker tag $DOCKER_IMAGE_NAME $DOCKER_REPO/$DOCKER_IMAGE_LATEST
docker tag $DOCKER_IMAGE_NAME $DOCKER_REPO/$DOCKER_IMAGE

# Push
# docker push $DOCKER_REPO/$DOCKER_IMAGE_LATEST
docker push $DOCKER_REPO/$DOCKER_IMAGE