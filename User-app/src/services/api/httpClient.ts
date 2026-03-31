import AsyncStorage from '@react-native-async-storage/async-storage';

import { env } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  ignoreStatuses?: number[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: {
    message?: string;
  };
};

class ApiHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

const buildQueryString = (query?: RequestOptions['query']) => {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    params.append(key, String(value));
  });

  const text = params.toString();
  return text ? `?${text}` : '';
};

const getBaseUrl = () => {
  const raw = String(env.apiBaseUrl || '').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const getErrorMessage = (status: number, fallback: string) => {
  if (status === 401) {
    return 'Session expired. Please login again.';
  }

  if (status === 403) {
    return 'You do not have access to this resource.';
  }

  return fallback;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    const error = 'EXPO_PUBLIC_API_BASE_URL is not configured.';
    console.error('[API]', error);
    throw new Error(error);
  }

  const { method = 'GET', body, query, auth = false, ignoreStatuses = [] } = options;
  const effectiveQuery = method === 'GET' ? { ...(query || {}), _ts: Date.now() } : query;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const url = `${baseUrl}${path}${buildQueryString(effectiveQuery)}`;
  console.log(`[API] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let parsed: ApiEnvelope<T> | null = null;

    try {
      parsed = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      if (ignoreStatuses.includes(response.status)) {
        return (parsed?.data as T) ?? ({} as T);
      }

      const serverMessage = parsed?.error?.message || parsed?.message;
      const errorMsg = getErrorMessage(response.status, serverMessage || `Request failed (${response.status})`);
      console.error(`[API] Error ${response.status}:`, errorMsg);
      throw new ApiHttpError(response.status, errorMsg);
    }

    if (parsed && 'data' in parsed) {
      console.log(`[API] Success: ${method} ${path}`);
      return parsed.data as T;
    }

    return (parsed as unknown as T) ?? ({} as T);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      throw error;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API] Network/Fetch error on ${method} ${path}:`, errorMsg);
    throw error;
  }
};
