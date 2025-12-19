# ZylkerKart AWS EKS Deployment Guide

This guide documents the steps to deploy the ZylkerKart microservices application to an AWS EKS cluster.

## 1. Prerequisites

Ensure you have the following tools installed and configured:

*   **AWS CLI**: `aws --version` (Configured with `aws configure`)
*   **eksctl**: `eksctl version` (For cluster management)
*   **kubectl**: `kubectl version` (For cluster interaction)
*   **Docker**: With `buildx` support for multi-arch builds (if deploying from an ARM64/M1 machine to x86 EKS nodes).

## 2. Infrastructure Provisioning

We use a 3-node cluster architecture for cost optimization and workload isolation.

### Cluster Configuration (`eks-cluster.yaml`)
- **Region**: `us-east-1`
- **Node Groups**:
    - `ng-services` (2x t3.medium): General application services.
    - `ng-mysql` (1x t3.small): Dedicated for MySQL (Taint: `dedicated=mysql:NoSchedule`).
    - `ng-redis` (1x t3.small): Dedicated for Redis (Taint: `dedicated=redis:NoSchedule`).

### Create Cluster
```bash
eksctl create cluster -f eks-cluster.yaml
```
*Duration: ~15-20 minutes*

## 3. Network & Ingress Setup

We use the **Nginx Ingress Controller** to provision a specific AWS Network Load Balancer and handle path-based routing.

### Install Controller
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml
```

### Routing Strategy
The `k8s/ingress.yaml` file defines the following rules:
- `/` -> `react-ui`
- `/api/auth` -> `authentication-service`
- `/api/common` -> `common-data-service`
- `/api/payment` -> `payment-gateway-service`
- `/api/search` -> `search-suggestion-service`

**Note**: The Ingress controller automatically rewrites paths (e.g., strips `/api/auth` before sending to the backend) using the annotation `nginx.ingress.kubernetes.io/rewrite-target: /$2`.

## 4. Build & Push Docker Images

Since AWS EKS nodes (t3 instances) are x86_64 architecture, if you are building on an Apple Silicon (M1/M2/M3) mac, you **must** build multi-arch images.

### Build Script
You can use the helper script or run commands manually:

```bash
# Example for Payment Gateway
docker buildx build --platform linux/amd64,linux/arm64 \
  -t impazhani/zylkerkart-payment-gateway-service:eks-v2 \
  -f server/payment-gateway-service/Dockerfile \
  --push server/payment-gateway-service
```

Ensure all your manifests in `k8s/` point to the correct image tags.

## 5. Deploy Application

### Create Namespace
```bash
kubectl create namespace zylkerkart
```

### Apply Manifests
Deploy configuration, databases, and microservices:
```bash
kubectl apply -f k8s/
```

This applies:
- `mysql.yaml` & `redis.yaml` (Databases)
- `authentication-service.yaml`
- `common-data-service.yaml`
- `payment-gateway-service.yaml`
- `search-suggestion-service.yaml`
- `react-ui.yaml`
- `ingress.yaml`

## 6. Verification

### Check Pods
Verify that pods are running and scheduled on the correct nodes (MySQL on `ng-mysql`, etc.):
```bash
kubectl get pods -n zylkerkart -o wide
```

### Access Application
Get the Load Balancer URL:
```bash
kubectl get ingress -n zylkerkart
```
Open the `ADDRESS` (e.g., `xxx.elb.us-east-1.amazonaws.com`) in your browser.

## Troubleshooting

### "Exec format error" (CrashLoopBackOff)
*   **Cause**: Running an ARM64 image on x86 EKS nodes.
*   **Fix**: Rebuild image with `--platform linux/amd64`.

### Payment Errors
*   **Check Logs**: `kubectl logs -n zylkerkart -l app=payment-gateway-service`
*   **Common Issue**: JSON parsing errors or incorrect URL construction in Frontend. Ensure `REACT_APP_PAYMENT_SERVICE_URL` is set correctly in `client/.env.production` (should be relative path `/api/payment`).
