"use strict";
/**
 * The transport every generated operation goes through.
 *
 * Framework-free by design: plain fetch, a base URL, and a token provider.
 * Call `configure` once; pass an `getAccessToken` that returns your current
 * JWT (or null for anonymous endpoints such as registration and login).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FintrackApiError = void 0;
exports.configure = configure;
exports.fintrackFetch = fintrackFetch;
let config = { baseUrl: '' };
function configure(next) {
    config = next;
}
class FintrackApiError extends Error {
    status;
    body;
    constructor(status, body, message) {
        super(message ?? `FinTrack API error ${status}`);
        this.status = status;
        this.body = body;
        this.name = 'FintrackApiError';
    }
}
exports.FintrackApiError = FintrackApiError;
async function fintrackFetch(url, init) {
    if (!config.baseUrl) {
        throw new Error('Call configure({ baseUrl }) before using the FinTrack SDK.');
    }
    const token = await config.getAccessToken?.();
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const doFetch = config.fetch ?? fetch;
    const response = await doFetch(`${config.baseUrl}${url}`, { ...init, headers });
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
        throw new FintrackApiError(response.status, body);
    }
    return body;
}
exports.default = fintrackFetch;
