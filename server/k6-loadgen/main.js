import { sleep } from 'k6';
import visitor from './scenarios/visitor.js';
import shopper from './scenarios/shopper.js';
import searcher from './scenarios/searcher.js';
import errors from './scenarios/errors.js';

// Total Target: Dynamic
// Distribution: Controlled by Env Vars
const VISITOR_RPM = parseInt(__ENV.VISITOR_RPM) || 500;
const SHOPPER_RPM = parseInt(__ENV.SHOPPER_RPM) || 800;
const SEARCHER_RPM = parseInt(__ENV.SEARCHER_RPM) || 300;
const ERROR_RPM = parseInt(__ENV.ERROR_RPM) || 500;

export const options = {
    scenarios: {
        visitor_flow: {
            executor: 'constant-arrival-rate',
            rate: VISITOR_RPM,
            timeUnit: '1m',
            duration: '24h', // Run continuously
            preAllocatedVUs: 30,
            maxVUs: 150,
            exec: 'runVisitor',
        },
        shopper_flow: {
            executor: 'constant-arrival-rate',
            rate: SHOPPER_RPM,
            timeUnit: '1m',
            duration: '24h',
            preAllocatedVUs: 20,
            maxVUs: 80,
            exec: 'runShopper',
        },
        searcher_flow: {
            executor: 'constant-arrival-rate',
            rate: SEARCHER_RPM,
            timeUnit: '1m',
            duration: '24h',
            preAllocatedVUs: 10,
            maxVUs: 50,
            exec: 'runSearcher',
        },
        error_flow: {
            executor: 'constant-arrival-rate',
            rate: ERROR_RPM,
            timeUnit: '1m',
            duration: '24h',
            preAllocatedVUs: 15,
            maxVUs: 60,
            exec: 'runErrors',
        },
    },
};

export function runVisitor() {
    visitor();
}

export function runShopper() {
    shopper();
}

export function runSearcher() {
    searcher();
}

export function runErrors() {
    errors();
}
