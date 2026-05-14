import type { ApiResponse, TokenResponse } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const ACCESS_TOKEN_KEY = 'payrollpro.accessToken';
const REFRESH_TOKEN_KEY = 'payrollpro.refreshToken';

type QueryValue = string | number | boolean | null | undefined;

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  errors?: ApiResponse<unknown>['errors'];

  constructor(message: string, status: number, errorCode?: string, errors?: ApiResponse<unknown>['errors']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

function buildQuery(params?: Record<string, QueryValue>) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const payload = (await response.json()) as ApiResponse<TokenResponse>;
  if (!payload.status || !payload.data?.access_token) {
    clearTokens();
    return false;
  }
  setTokens(payload.data);
  return true;
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, QueryValue> } = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const { params, headers, body, ...rest } = options;
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    ...rest,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    window.dispatchEvent(new Event('payrollpro:logout'));
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || payload?.status === false) {
    throw new ApiError(
      payload?.message || payload?.detail || 'Request failed',
      response.status,
      payload?.error_code,
      payload?.errors,
    );
  }

  return payload?.data as T;
}

export const apiClient = {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  get: <T>(path: string, params?: Record<string, QueryValue>) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown, params?: Record<string, QueryValue>) =>
    request<T>(path, { method: 'POST', params, body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, params?: Record<string, QueryValue>) =>
    request<T>(path, { method: 'PUT', params, body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string, params?: Record<string, QueryValue>) => request<T>(path, { method: 'DELETE', params }),
};
