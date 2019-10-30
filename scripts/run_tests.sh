#!/usr/bin/env bash
envoy -c /etc/envoy/config/envoy.yaml -l info --concurrency 8 &
sudo ./src/sidecar/k8/scripts/ip-tables-hook.sh
node ./athena.js run --performance -t /etc/tests