import type { ApiEnvelope, ApiValidationError } from "@/types/domain";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

type ApiClientOptions = {
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  onForbidden?: (error: ApiError) => void;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  rawResponse?: boolean;
};

let getAccessToken: (() => string | null) | undefined;
let onUnauthorized: (() => void) | undefined;
let onForbidden: ((error: ApiError) => void) | undefined;

export class ApiError extends Error {
  statusCode: number;
  details: unknown;
  fieldErrors: ApiValidationError[];

  constructor(message: string, statusCode: number, details?: unknown, fieldErrors: ApiValidationError[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

export function configureApiClient(options: ApiClientOptions) {
  getAccessToken = options.getAccessToken;
  onUnauthorized = options.onUnauthorized;
  onForbidden = options.onForbidden;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function buildQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseValidationErrors(payload: unknown): ApiValidationError[] {
  if (!isObject(payload) || !Array.isArray(payload.detail)) {
    return [];
  }

  return payload.detail
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const fieldPath = Array.isArray(item.loc) ? item.loc.join(".") : "form";
      const message = typeof item.msg === "string" ? item.msg : "Invalid value";
      return { field: fieldPath, message };
    })
    .filter(Boolean) as ApiValidationError[];
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (isObject(payload)) {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  }

  return fallback;
}

function createError(response: Response, payload: unknown) {
  const fallbackMessage = response.status >= 500 ? "Something went wrong on the server." : "Request failed.";
  const fieldErrors = parseValidationErrors(payload);
  const message = fieldErrors[0]?.message || getErrorMessage(payload, fallbackMessage);

  return new ApiError(message, response.status, payload, fieldErrors);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, rawResponse, ...rest } = options;
  const token = getAccessToken?.();
  const requestHeaders = new Headers(headers || {});

  requestHeaders.set("Accept", "application/json");

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  const isEnvelope = isObject(payload) && "data" in payload && "status" in payload;
  const backendFailed = isEnvelope && payload.status === false;

  if (!response.ok || backendFailed) {
    const error = createError(response, payload);

    if (response.status === 401) {
      onUnauthorized?.();
    }

    if (response.status === 403) {
      onForbidden?.(error);
    }

    throw error;
  }

  if (rawResponse) {
    return payload as T;
  }

  if (isEnvelope) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}
