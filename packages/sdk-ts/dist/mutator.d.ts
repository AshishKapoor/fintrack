/**
 * The transport every generated operation goes through.
 *
 * Framework-free by design: plain fetch, a base URL, and a token provider.
 * Call `configure` once; pass an `getAccessToken` that returns your current
 * JWT (or null for anonymous endpoints such as registration and login).
 */
export interface FintrackConfig {
    baseUrl: string;
    getAccessToken?: () => string | null | Promise<string | null>;
    fetch?: typeof fetch;
}
export declare function configure(next: FintrackConfig): void;
export declare class FintrackApiError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, body: unknown, message?: string);
}
export declare function fintrackFetch<T>(url: string, init?: RequestInit): Promise<T>;
export default fintrackFetch;
