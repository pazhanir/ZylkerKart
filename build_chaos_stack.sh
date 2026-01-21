#!/bin/bash
set -e

echo "1. Building Multi-Arch Chaos Simulator (v11)..."
docker buildx build --platform linux/amd64,linux/arm64 -t impazhani/site24x7-sim:v11 --push server/site24x7-sim

echo "2. Building Multi-Arch Load Gen Agent (v3-agent)..."
# Note: LoadGen relies on `main.js` which is in `server/k6-loadgen`
# Dockerfile is also there.
docker buildx build --platform linux/amd64,linux/arm64 -t impazhani/zylkerkart-loadgen:v3-agent --push server/k6-loadgen

echo "3. Updating Kubernetes Deployments..."
# Update images in YAMLs using sed (in-place)
sed -i '' 's|impazhani/site24x7-sim:.*|impazhani/site24x7-sim:v11|g' k8s/site24x7-sim.yaml
sed -i '' 's|impazhani/zylkerkart-loadgen:.*|impazhani/zylkerkart-loadgen:v3-agent|g' k8s/load-generator.yaml

echo "4. Applying Manifests..."
kubectl apply -f k8s/site24x7-sim.yaml
kubectl apply -f k8s/load-generator.yaml

echo "5. Restarting Deployments..."
kubectl rollout restart deployment site24x7-sim -n site24x7-operator
kubectl rollout restart deployment zylkerkart-loadgen -n site24x7-operator

echo "✅ All Systems Updated!"
