import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
  if (token) {
    (config.headers as any) = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = new Error(
      error?.response?.data?.message || error?.message || 'Request failed'
    ) as ApiError;
    apiError.status = error?.response?.status;
    apiError.code = error?.response?.data?.code;
    return Promise.reject(apiError);
  }
);

