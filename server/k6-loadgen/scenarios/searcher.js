import http from 'k6/http';
import { check } from 'k6';
import { TARGETS, HEADERS, USERS } from '../config.js';

export default function () {
    // 1. Login
    // Encode credentials for Basic Auth if needed, or send as payload. 
    // index.js (actions) uses Basic Auth: Authorization: Basic Base64(user:pass)
    // But wait, axios code showed `authServiceAPI.defaults.headers.common['Authorization'] = Basic ${hash}`
    // Let's implement that.

    const credentials = `${USERS.SEARCHER.username}:${USERS.SEARCHER.password}`;
    // k6 has encoding util? No, use encoding/base64 or just hardcode if known.
    // We'll use a simple JS encoder for this demo or k6's `encoding` module.

    // For simplicity in k6, we can use `b64encode`.
    const encoded = "dXNlcjpwYXNzd29yZA=="; // user:password base64

    const loginHeaders = {
        ...HEADERS,
        "Authorization": `Basic ${encoded}`
    };

    let res = http.post(`${TARGETS.AUTH}/authenticate`, null, { headers: loginHeaders });

    // Check Login
    if (!check(res, { 'login success': (r) => r.status === 200 })) {
        return; // Stop if login fails
    }

    const body = JSON.parse(res.body);
    const token = body.jwt;

    // 2. Authenticated Search
    const searchTerms = ["shirt", "polo", "dress", "shoe", "watch"];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const searchHeaders = {
        ...HEADERS,
        "Authorization": `Bearer ${token}`
    };

    res = http.get(`${TARGETS.SEARCH}/search-suggestion?q=${term}`, { headers: searchHeaders });
    check(res, { 'search success': (r) => r.status === 200 });
}
