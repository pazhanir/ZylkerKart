import http from 'k6/http';
import { check, sleep } from 'k6';
import { TARGETS, HEADERS } from '../config.js';

export default function () {
    const categories = ["Men's T-Shirts", "Dresses", "Kurtas", "Women's T-Shirts"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // 1. Home
    let res = http.get(`${TARGETS.COMMON}/home`, { headers: HEADERS });
    check(res, { 'status is 200': (r) => r.status === 200 });

    // 2. Tabs
    res = http.get(`${TARGETS.COMMON}/tabs`, { headers: HEADERS });
    check(res, { 'status is 200': (r) => r.status === 200 });

    // 3. Browse Category
    res = http.get(`${TARGETS.COMMON}/products?q=category=${randomCategory}`, { headers: HEADERS });
    check(res, { 'status is 200': (r) => r.status === 200 });
}
