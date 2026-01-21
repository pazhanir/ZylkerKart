
// Base Configuration
export const BASE_URL = __ENV.BASE_URL || "http://zylkerkart-proxy"; // Default to internal proxy service if available, or ingress
// In cluster, we should target the services directly or via ingress. 
// Given the rewrite rules, let's target the Ingress Controller service or specific services if possible.
// User requested "run as a service in site24x7-operator namespace".
// The other services are in 'zylkerkart' namespace. 
// Cross-namespace communication: http://<service>.<namespace>.svc.cluster.local

export const TARGETS = {
    COMMON: "http://common-data-service.zylkerkart.svc.cluster.local:9000",
    AUTH: "http://authentication-service.zylkerkart.svc.cluster.local:7000",
    SEARCH: "http://search-suggestion-service.zylkerkart.svc.cluster.local:10000",
    PAYMENT: "http://payment-gateway-service.zylkerkart.svc.cluster.local:9050"
};

export const HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
};

export const USERS = {
    SEARCHER: {
        username: "john.doe@gmail.com",
        password: "qwerty123"
    }
};
