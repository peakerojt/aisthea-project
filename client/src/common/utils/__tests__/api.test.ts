import { beforeEach, describe, expect, it, vi } from 'vitest';

const translateMock = vi.fn((key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key);

vi.mock('@/i18n/config', () => ({
  default: {
    resolvedLanguage: 'vi',
    language: 'vi',
    t: (...args: Parameters<typeof translateMock>) => translateMock(...args),
  },
}));

type ApiModule = typeof import('@/common/utils/api');

const makeResponse = (
  status: number,
  body: unknown,
  extras?: Partial<{ ok: boolean; statusText: string }>,
) => ({
  ok: extras?.ok ?? (status >= 200 && status < 300),
  status,
  statusText: extras?.statusText ?? '',
  json: vi.fn().mockResolvedValue(body),
});

describe('api client auth/session flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    translateMock.mockImplementation((key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn());
    window.sessionStorage.clear();
    document.cookie = 'csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.history.pushState({}, '', '/login');
  });

  const loadApi = async (): Promise<ApiModule['api']> => {
    const { api } = await import('@/common/utils/api');
    return api;
  };

  it('refreshes the session and retries the original request after a 401', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { errorCode: 'UNAUTHORIZED', message: 'Unauthorized' }) as never)
      .mockResolvedValueOnce(makeResponse(200, { data: { csrfToken: 'csrf-from-body' } }) as never)
      .mockResolvedValueOnce(makeResponse(200, { success: true }) as never)
      .mockResolvedValueOnce(makeResponse(200, { data: 'ok' }) as never);

    const api = await loadApi();
    const result = await api.get<{ data: string }>('/api/protected');

    expect(result).toEqual({ data: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:5000/api/auth/csrf-token',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:5000/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'x-csrf-token': 'csrf-from-body',
          'x-lang': 'vi',
          'accept-language': 'vi',
        }),
      }),
    );
  });

  it('does not dispatch logout when a 401 request is made with skipAuthRedirect', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { errorCode: 'UNAUTHORIZED', message: 'Unauthorized' }) as never)
      .mockResolvedValueOnce(makeResponse(200, { data: { csrfToken: 'csrf-from-body' } }) as never)
      .mockResolvedValueOnce(makeResponse(401, { errorCode: 'UNAUTHORIZED', message: 'Refresh failed' }) as never);

    const logoutListener = vi.fn();
    window.addEventListener('auth:logout', logoutListener);

    const api = await loadApi();

    await expect(api.get('/api/protected', { skipAuthRedirect: true })).rejects.toMatchObject({
      message: 'Unauthorized',
      status: 401,
      skipAuthRedirect: true,
    });

    expect(logoutListener).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();

    window.removeEventListener('auth:logout', logoutListener);
  });

  it('dispatches a network error toast when fetch fails', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const toastListener = vi.fn();
    window.addEventListener('app:toast', toastListener);

    const api = await loadApi();

    await expect(api.get('/api/products')).rejects.toThrow('Failed to fetch');

    expect(toastListener).toHaveBeenCalledTimes(1);
    expect(toastListener.mock.calls[0]?.[0]).toMatchObject({
      detail: {
        type: 'error',
        title: 'Network error',
        subtitle: 'Cannot reach server',
      },
    });

    window.removeEventListener('app:toast', toastListener);
  });
});
