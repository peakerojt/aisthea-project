// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
}

/**
 * Centralized API client with automatic credential inclusion for cookie-based auth
 */
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Make HTTP request with credentials included
     */
    private async request<T>(
        endpoint: string,
        options: FetchOptions = {}
    ): Promise<T> {
        const { params, ...fetchOptions } = options;

        // Build URL with query parameters
        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        // Always include credentials for cookie-based auth
        const config: RequestInit = {
            ...fetchOptions,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            // Handle non-OK responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                }));
                const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;

                // Global Toast Trigger for server/app errors
                if (response.status >= 500) {
                    window.dispatchEvent(new CustomEvent('app:toast', {
                        detail: { type: 'error', title: 'Lỗi máy chủ', subtitle: errorMessage }
                    }));
                }

                // If unauthorized (session expired), redirect to login
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login';
                    }
                    window.dispatchEvent(new CustomEvent('app:toast', {
                        detail: { type: 'error', title: 'Hết phiên đăng nhập', subtitle: 'Vui lòng đăng nhập lại' }
                    }));
                }

                // If account is banned, dispatch a global event so AuthContext can auto-logout
                if (response.status === 403 && errorData?.code === 'ACCOUNT_BANNED') {
                    window.dispatchEvent(new CustomEvent('auth:banned', {
                        detail: { message: errorData.message },
                    }));
                }

                throw new Error(errorMessage);
            }

            // Parse JSON response
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { type: 'error', title: 'Lỗi kết nối', subtitle: 'Không thể tải dữ liệu từ máy chủ' }
                }));
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, data?: unknown, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

// Create and export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export API_BASE_URL for direct use if needed
export { API_BASE_URL };
