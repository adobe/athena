#!/usr/bin/env bash
../webhook-create-signed-cert.sh \
    --service sidecar-injector-webhook-svc \
    --secret sidecar-injector-webhook-certs \
    --namespace default
cat ../mutatingwebhook.yaml | \
    ../webhook-patch-ca-bundle.sh > \
    ../mutatingwebhook-ca-bundle.yaml

kubectl create -f ../nginxconfigmap.yaml
kubectl create -f ../configmap.yaml
kubectl create -f ../deployment.yaml
kubectl create -f ../service.yaml
kubectl create -f ../mutatingwebhook-ca-bundle.yaml
