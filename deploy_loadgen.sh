#!/bin/bash
set -e

# 1. Build and Push Multi-Arch Docker Image
echo "Setting up Multi-Arch Builder..."
docker buildx rm zylkerbuilder || true
docker buildx create --use --name zylkerbuilder --driver docker-container --bootstrap

echo "Building and Pushing Multi-Arch Docker Image..."
# Using single line to avoid shell parsing errors
docker buildx build --platform linux/amd64,linux/arm64 -t impazhani/zylkerkart-loadgen:latest --push server/k6-loadgen

echo "Docker Image Pushed: impazhani/zylkerkart-loadgen:latest"

# 2. Deploy to EKS
echo "Deploying to EKS (namespace: site24x7-operator)..."
kubectl apply -f k8s/load-generator.yaml -n site24x7-operator

# 3. Restart to pick up new image if it already existed
kubectl rollout restart deployment zylkerkart-loadgen -n site24x7-operator

echo "Deployment Complete!"
