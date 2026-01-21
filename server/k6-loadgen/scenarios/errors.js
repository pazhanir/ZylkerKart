import http from 'k6/http';
import { check } from 'k6';
import { TARGETS, HEADERS } from '../config.js';

export default function () {
    const rand = Math.random();

    if (rand < 0.33) {
        // 1. 401 Unauthorized (Bad Login)
        const badHeaders = { ...HEADERS, "Authorization": "Basic YmFkOmNyZWRz" }; // bad:creds
        let res = http.post(`${TARGETS.AUTH}/authenticate`, null, { headers: badHeaders });
        check(res, { 'is 401': (r) => r.status === 401 });

    } else if (rand < 0.66) {
        // 2. 404 Not Found
        let res = http.get(`${TARGETS.COMMON}/products?product_id=999999`, { headers: HEADERS });
        // Assuming backend returns 404 or empty for invalid ID, verify response
        // Actually, sometimes backend returns 200 with empty list. 
        // Let's hit a completely wrong URL to ensure 404.
        res = http.get(`${TARGETS.COMMON}/non-existent-endpoint`, { headers: HEADERS });
        check(res, { 'is 404': (r) => r.status === 404 });

    } else {
        // 3. 500/400 Bad Payload to Checkout
        const badPayload = JSON.stringify({ "id": "tok_visa" }); // Missing mandatory fields
        let res = http.post(`${TARGETS.PAYMENT}/payment`, badPayload, { headers: HEADERS });
        check(res, { 'is error': (r) => r.status >= 400 });
    }
}
