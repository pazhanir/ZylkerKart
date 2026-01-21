import http from 'k6/http';
import { check } from 'k6';
import { TARGETS, HEADERS } from '../config.js';

export default function () {
    // 1. View Product (Simulated ID)
    const productId = Math.floor(Math.random() * 20) + 1;
    let res = http.get(`${TARGETS.COMMON}/products?product_id=${productId}`, { headers: HEADERS });
    check(res, { 'status is 200': (r) => r.status === 200 });

    // 2. Checkout / Payment
    const payload = JSON.stringify({
        "id": "tok_visa",
        "card": {
            "id": "card_123",
            "last4": "4242",
            "exp_month": 12,
            "exp_year": 2025,
            "brand": "Visa"
        },
        "amount": 5000,
        "currency": "usd"
    });

    res = http.post(`${TARGETS.PAYMENT}/payment`, payload, { headers: HEADERS });
    check(res, { 'payment success': (r) => r.status === 200 || r.status === 201 });
}
