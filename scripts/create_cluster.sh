#!/usr/bin/env bash

node_modules/.bin/pm2
node atena.js cluster --init --addr 0.0.0.0
node_modules/.bin/pm2 logs athena