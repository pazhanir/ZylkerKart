#!/bin/bash
set -e

# Ensure builder exists
docker buildx create --use --name zylkerkart-builder || true

echo "Building and Pushing Authentication Service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-authentication-service:latest \
  -f server/authentication-service/Dockerfile-prod \
  --push server/authentication-service

echo "Building and Pushing Common Data Service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-common-data-service:latest \
  -f server/common-data-service/Dockerfile-prod \
  --push server/common-data-service

echo "Building and Pushing Payment Gateway Service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-payment-gateway-service:latest \
  -f server/payment-gateway-service/Dockerfile \
  --push server/payment-gateway-service

echo "Building and Pushing Search Suggestion Service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-search-suggestion-service:latest \
  -f server/search-suggestion-service/Dockerfile-prod \
  --push server/search-suggestion-service

echo "Building and Pushing React UI..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-react-ui:latest \
  -f client/Dockerfile \
  --push client

echo "All services built and pushed successfully!"
