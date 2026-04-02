import i18n from '@/i18n/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const DEFAULT_LANGUAGE = 'vi';

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
    skipAuthRedirect?: boolean;
    cacheTtlMs?: number;
    dedupeKey?: string;
    skipDedupe?: boolean;
    skipCache?: boolean;
    _retriedAfterRefresh?: boolean;
}

type ApiErrorPayload = {
    code?: string;
    errorCode?: string;
    error?: string | {
        code?: string;
        errorCode?: string;
        message?: string;
        messageKey?: string;
        type?: 'VALIDATION' | 'BUSINESS' | 'AUTH' | 'PERMISSION' | 'SYSTEM' | string;
        field?: string;
        details?: Array<{ field?: string; code?: string; message?: string }> | Record<string, unknown>;
        traceId?: string;
    };
    message?: string;
    messageKey?: string;
    type?: 'VALIDATION' | 'BUSINESS' | 'AUTH' | 'PERMISSION' | 'SYSTEM' | string;
    field?: string;
    details?: Array<{ field?: string; code?: string; message?: string }> | Record<string, unknown>;
    traceId?: string;
};

const getNestedErrorPayload = (payload: ApiErrorPayload) =>
    typeof payload.error === 'object' && payload.error !== null ? payload.error : undefined;

const PREFER_SERVER_MESSAGE_CODES = new Set([
    'VALIDATION_ERROR',
    'INVALID_BODY',
    'MISSING_REQUIRED_FIELDS',
]);

const getActiveLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
    return current.split('-')[0] || DEFAULT_LANGUAGE;
};

const resolveApiMessage = (payload: ApiErrorPayload, fallback: string) => {
    const nestedError = getNestedErrorPayload(payload);
    const message = payload.message || nestedError?.message;
    const messageKey = payload.messageKey || nestedError?.messageKey;

    if (typeof messageKey === 'string' && messageKey.length > 0) {
        return i18n.t(messageKey, { defaultValue: message || fallback });
    }

    const code = typeof payload.errorCode === 'string'
        ? payload.errorCode
        : typeof payload.code === 'string'
            ? payload.code
            : typeof nestedError?.errorCode === 'string'
                ? nestedError.errorCode
                : typeof nestedError?.code === 'string'
                    ? nestedError.code
                : typeof payload.error === 'string'
                    ? payload.error
                    : undefined;

    if (typeof message === 'string' && message.trim().length > 0 && code && PREFER_SERVER_MESSAGE_CODES.has(code)) {
        return message;
    }

    if (code) {
        return i18n.t(`errors:${code}`, { defaultValue: message || code });
    }

    return message || fallback;
};

class ApiClient {
    private baseUrl: string;
    private pendingGetRequests = new Map<string, Promise<unknown>>();
    private responseCache = new Map<string, { expiresAt: number; data: unknown }>();
    private refreshPromise: Promise<boolean> | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getCookie(name: string): string | undefined {
        if (typeof document === 'undefined') return undefined;
        const source = `; ${document.cookie}`;
        const parts = source.split(`; ${name}=`);
        if (parts.length !== 2) return undefined;
        return decodeURIComponent(parts.pop()!.split(';').shift() || '');
    }

    private async ensureCsrfToken(): Promise<string | undefined> {
        const existing = this.getCookie(CSRF_COOKIE_NAME);
        if (existing) return existing;

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const payload = (await response.json().catch(() => null)) as { data?: { csrfToken?: string } } | null;
                return this.getCookie(CSRF_COOKIE_NAME) || payload?.data?.csrfToken;
            }
        } catch {
            // ignore and let server return 403 if token is required
        }

        return this.getCookie(CSRF_COOKIE_NAME);
    }

    private shouldAttemptRefresh(endpoint: string, options: FetchOptions): boolean {
        if (options._retriedAfterRefresh) return false;

        const normalizedEndpoint = endpoint.toLowerCase();
        return ![
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/logout',
            '/api/auth/refresh',
            '/api/auth/verify-email',
            '/api/auth/resend-verification',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
        ].includes(normalizedEndpoint);
    }

    private async refreshAccessToken(): Promise<boolean> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                const csrfToken = await this.ensureCsrfToken();
                const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-lang': getActiveLanguage(),
                        'accept-language': getActiveLanguage(),
                        ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
                    },
                });

                if (!response.ok) {
                    return false;
                }

                await response.json().catch(() => null);
                return true;
            } catch {
                return false;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const {
            params,
            skipAuthRedirect,
            cacheTtlMs = 0,
            dedupeKey,
            skipDedupe = false,
            skipCache = false,
            _retriedAfterRefresh = false,
            ...fetchOptions
        } = options;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const shouldAttachCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
        const csrfToken = shouldAttachCsrf ? await this.ensureCsrfToken() : undefined;
        const activeLanguage = getActiveLanguage();
        const requestKey = dedupeKey || `${method}:${url}:${activeLanguage}`;

        const config: RequestInit = {
            ...fetchOptions,
            credentials: 'include',
            headers: {
                ...(!(fetchOptions.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
                'x-lang': activeLanguage,
                'accept-language': activeLanguage,
                ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
                ...fetchOptions.headers,
            },
        };

        if (method === 'GET' && !skipCache) {
            const cached = this.responseCache.get(requestKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.data as T;
            }
            if (cached) {
                this.responseCache.delete(requestKey);
            }
        }

        if (method === 'GET' && !skipDedupe) {
            const pending = this.pendingGetRequests.get(requestKey);
            if (pending) {
                return pending as Promise<T>;
            }
        }

        const executeRequest = async (): Promise<T> => {
            const response = await fetch(url, config);

            if (!response.ok) {
                if (response.status === 401 && this.shouldAttemptRefresh(endpoint, { ...options, _retriedAfterRefresh })) {
                    const refreshed = await this.refreshAccessToken();

                    if (refreshed) {
                        return this.request<T>(endpoint, {
                            ...options,
                            _retriedAfterRefresh: true,
                            skipDedupe: true,
                            skipCache: true,
                        });
                    }
                }

                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                })) as ApiErrorPayload;

                const fallbackMessage = `Request failed with status ${response.status}`;
                const errorMessage = resolveApiMessage(errorData, fallbackMessage);
                const nestedError = getNestedErrorPayload(errorData);
                const errorCode =
                    typeof errorData.code === 'string'
                        ? errorData.code
                        : typeof errorData.errorCode === 'string'
                            ? errorData.errorCode
                            : typeof nestedError?.code === 'string'
                                ? nestedError.code
                                : typeof nestedError?.errorCode === 'string'
                                    ? nestedError.errorCode
                                    : undefined;
                const messageKey =
                    typeof errorData.messageKey === 'string'
                        ? errorData.messageKey
                        : typeof nestedError?.messageKey === 'string'
                            ? nestedError.messageKey
                            : undefined;

                if (response.status >= 500) {
                    window.dispatchEvent(new CustomEvent('app:toast', {
                        detail: {
                            type: 'error',
                            title: i18n.t('errors:INTERNAL_SERVER_ERROR', { defaultValue: 'Server error' }),
                            subtitle: errorMessage,
                        },
                    }));
                }

                if (response.status === 401 && !skipAuthRedirect) {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login';
                    }
                    window.dispatchEvent(new CustomEvent('app:toast', {
                        detail: {
                            type: 'error',
                            title: i18n.t('errors:TOKEN_EXPIRED', { defaultValue: 'Session expired' }),
                            subtitle: i18n.t('errors:UNAUTHORIZED', { defaultValue: 'Please sign in again' }),
                        },
                    }));
                }

                if (response.status === 403 && (errorData?.code === 'ACCOUNT_BANNED' || errorData?.errorCode === 'ACCOUNT_BANNED')) {
                    window.dispatchEvent(new CustomEvent('auth:banned', {
                        detail: { message: errorData.message || errorMessage },
                    }));
                }

                const err = new Error(errorMessage) as Error & {
                    status: number;
                    code?: string;
                    messageKey?: string;
                    type?: string;
                    field?: string;
                    details?: Array<{ field?: string; code?: string; message?: string }>;
                    traceId?: string;
                    skipAuthRedirect?: boolean;
                };
                err.status = response.status;
                err.code = errorCode;
                err.messageKey = messageKey;
                err.type = errorData.type ?? nestedError?.type;
                err.field =
                    typeof errorData.field === 'string'
                        ? errorData.field
                        : typeof nestedError?.field === 'string'
                            ? nestedError.field
                            : undefined;
                err.details = Array.isArray(errorData.details)
                    ? errorData.details
                    : Array.isArray(nestedError?.details)
                        ? nestedError.details
                        : undefined;
                err.traceId =
                    typeof errorData.traceId === 'string'
                        ? errorData.traceId
                        : typeof nestedError?.traceId === 'string'
                            ? nestedError.traceId
                            : undefined;
                err.skipAuthRedirect = skipAuthRedirect;
                throw err;
            }

            const data = await response.json();
            if (method === 'GET' && cacheTtlMs > 0 && !skipCache) {
                this.responseCache.set(requestKey, {
                    expiresAt: Date.now() + cacheTtlMs,
                    data,
                });
            }
            return data;
        };

        const requestPromise = executeRequest().catch((error) => {
            const apiErr = error as Error & { status?: number; skipAuthRedirect?: boolean };
            const isExpectedAuthError = apiErr.status === 401 && apiErr.skipAuthRedirect === true;
            if (!isExpectedAuthError) {
                console.error('API request failed:', error);
            }

            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: {
                        type: 'error',
                        title: i18n.t('errors:NETWORK_ERROR', { defaultValue: 'Network error' }),
                        subtitle: i18n.t('errors:FETCH_DATA_FAILED', { defaultValue: 'Cannot reach server' }),
                    },
                }));
            }
            throw error;
        }).finally(() => {
            if (method === 'GET') {
                this.pendingGetRequests.delete(requestKey);
            }
        });

        if (method === 'GET' && !skipDedupe) {
            this.pendingGetRequests.set(requestKey, requestPromise);
        }

        return requestPromise;
    }

    async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    async patch<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);
export { API_BASE_URL };

