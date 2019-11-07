#!/usr/bin/env bash
envoy -c /etc/envoy/config/envoy.yaml -l debug --concurrency 4 &
sudo ./src/sidecar/k8/scripts/ip-tables-hook.sh
sudo node ./athena.js run --performance