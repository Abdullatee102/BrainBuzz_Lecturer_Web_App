import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_KEY = 'brainbuzz_lecturer_token';
export const REFRESH_TOKEN_KEY = 'brainbuzz_lecturer_refresh_token';
export const USER_KEY = 'brainbuzz_lecturer_user';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  'http://localhost:5000/api';

const getStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStorageItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Manage token refresh and auth error redirects
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ status?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // Do not attempt refresh on auth login requests or if already on login page
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/lecturer/login') &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      currentPath !== '/login'
    ) {
      const refreshToken = getStorageItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        // No refresh token available, session is expired
        clearLecturerSession();
        if (typeof window !== 'undefined') {
          window.location.href = `/login?expired=1&from=${encodeURIComponent(currentPath)}`;
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue concurrent requests while token is refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<{
          status: string;
          tokens: { accessToken: string; refreshToken: string };
        }>(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newTokens = refreshResponse.data?.tokens;
        if (newTokens?.accessToken) {
          setStorageItem(TOKEN_KEY, newTokens.accessToken);
          if (newTokens.refreshToken) {
            setStorageItem(REFRESH_TOKEN_KEY, newTokens.refreshToken);
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          }
          processQueue(null, newTokens.accessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing token payload');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearLecturerSession();
        if (typeof window !== 'undefined') {
          window.location.href = `/login?expired=1&from=${encodeURIComponent(currentPath)}`;
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function clearLecturerSession(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function humanizeErrorMessage(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'An unexpected error occurred.';

  // If message contains technical Zod validation artifacts
  if (
    raw.includes('body.') ||
    raw.includes('query.') ||
    raw.includes('params.') ||
    raw.includes('Invalid input:') ||
    raw.includes('Invalid option:') ||
    raw.includes('expected string') ||
    raw.includes('received undefined')
  ) {
    const segments = raw.split(/,\s*(?=(?:body|query|params)\.)/i);
    const friendlySegments = segments.map((seg) => {
      let clean = seg.replace(/^(?:body|query|params)\./i, '');

      clean = clean
        .replace(/^id:\s*/i, 'Identifier: ')
        .replace(/^title:\s*/i, 'Title: ')
        .replace(/^description:\s*/i, 'Description: ')
        .replace(/^courseId:\s*/i, 'Course: ')
        .replace(/^questionText:\s*/i, 'Question Text: ')
        .replace(/^options:\s*/i, 'Answer Options: ')
        .replace(/^correctOption:\s*/i, 'Correct Option: ')
        .replace(/^userId:\s*/i, 'Student / User: ')
        .replace(/^email:\s*/i, 'Email Address: ')
        .replace(/^fullName:\s*/i, 'Full Name: ')
        .replace(/^password:\s*/i, 'Password: ')
        .replace(/^reason:\s*/i, 'Reason: ');

      clean = clean.replace(
        /Invalid input:\s*expected\s+(\w+),\s*received\s+undefined/i,
        'is required. Please provide a valid value.'
      );
      clean = clean.replace(
        /Invalid input:\s*expected\s+(\w+),\s*received\s+(\w+)/i,
        'must be a valid $1.'
      );

      if (clean.includes('Invalid option:')) {
        clean = clean.replace(
          /Invalid option:\s*expected one of\s+("[^"]+"(?:\|"[^"]+")*)/i,
          (_, optionsStr) => {
            const opts = optionsStr
              .replace(/"/g, '')
              .split('|')
              .slice(0, 4)
              .map((s: string) =>
                s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
              )
              .join(', ');
            return `Please select a valid option (e.g. ${opts}).`;
          }
        );
      }

      clean = clean.replace(/^([^:]+):\s*is required\./i, '$1 is required.');
      return clean.trim();
    });

    return friendlySegments.join(' ');
  }

  return raw;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const rawMsg =
      error.response?.data?.message ||
      error.message ||
      'An unexpected server error occurred.';
    return humanizeErrorMessage(rawMsg);
  }
  if (error instanceof Error) {
    return humanizeErrorMessage(error.message);
  }
  return 'An unexpected error occurred.';
}

export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
