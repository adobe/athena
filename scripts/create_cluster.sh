#!/usr/bin/env bash

# Copyright 2019 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.


envoy -c /etc/envoy/config/envoy.yaml -l info --concurrency 8 &
./src/sidecar/k8/scripts/ip-tables-hook.sh
node_modules/.bin/pm2
node athena.js cluster --init --addr 0.0.0.0
node_modules/.bin/pm2 logs athena-manager