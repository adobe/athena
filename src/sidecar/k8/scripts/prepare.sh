#!/usr/bin/env bash
docker build -t atrifan/athena:v1 -f ../../../../Dockerfile  .

docker push atrifan/athena:v1

kubectl delete -f ../nginxconfigmap.yaml
kubectl delete -f ../configmap.yaml
kubectl delete -f ../deployment.yaml
kubectl delete -f ../service.yaml
kubectl delete -f ../mutatingwebhook-ca-bundle.yaml

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
