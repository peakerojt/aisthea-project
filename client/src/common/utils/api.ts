import i18n from '@/i18n/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const DEFAULT_LANGUAGE = 'vi';

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
    skipAuthRedirect?: boolean;
}

type ApiErrorPayload = {
    code?: string;
    errorCode?: string;
    error?: string;
    message?: string;
    messageKey?: string;
};

const getActiveLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
    return current.split('-')[0] || DEFAULT_LANGUAGE;
};

const resolveApiMessage = (payload: ApiErrorPayload, fallback: string) => {
    if (typeof payload.messageKey === 'string' && payload.messageKey.length > 0) {
        return i18n.t(payload.messageKey, { defaultValue: payload.message || fallback });
    }

    const code = typeof payload.errorCode === 'string'
        ? payload.errorCode
        : typeof payload.code === 'string'
            ? payload.code
            : typeof payload.error === 'string'
                ? payload.error
                : undefined;

    if (code) {
        return i18n.t(`errors:${code}`, { defaultValue: payload.message || code });
    }

    return payload.message || fallback;
};

class ApiClient {
    private baseUrl: string;

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

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { params, skipAuthRedirect, ...fetchOptions } = options;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        const method = (fetchOptions.method || 'GET').toUpperCase();
        const shouldAttachCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
        const csrfToken = shouldAttachCsrf ? await this.ensureCsrfToken() : undefined;
        const activeLanguage = getActiveLanguage();

        const config: RequestInit = {
            ...fetchOptions,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-lang': activeLanguage,
                'accept-language': activeLanguage,
                ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
                ...fetchOptions.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                })) as ApiErrorPayload;

                const fallbackMessage = `Request failed with status ${response.status}`;
                const errorMessage = resolveApiMessage(errorData, fallbackMessage);
                const errorCode =
                    typeof errorData.code === 'string'
                        ? errorData.code
                        : typeof errorData.errorCode === 'string'
                            ? errorData.errorCode
                            : undefined;
                const messageKey = typeof errorData.messageKey === 'string' ? errorData.messageKey : undefined;

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
                    skipAuthRedirect?: boolean;
                };
                err.status = response.status;
                err.code = errorCode;
                err.messageKey = messageKey;
                err.skipAuthRedirect = skipAuthRedirect;
                throw err;
            }

            return await response.json();
        } catch (error) {
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
        }
    }

    async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);
export { API_BASE_URL };

