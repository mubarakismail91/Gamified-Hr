import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

// Every API response gets automatic ISO string -> Date conversion, so callers
// never see a raw ISO string where the rest of the app expects a real Date.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
    return out;
  }
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

// Access token lives in memory only (never localStorage) — an XSS bug can at
// worst steal this short-lived token, not the long-lived refresh token,
// which is an httpOnly cookie JS can never read. Lost on a full page reload
// by design; AuthContext restores it via a silent /auth/refresh on mount.
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends/receives the httpOnly refresh cookie
  transformResponse: [
    (data) => {
      if (typeof data !== "string" || data.length === 0) return data;
      try {
        return reviveDates(JSON.parse(data));
      } catch {
        return data;
      }
    },
  ],
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Bare instance (no interceptors) for the refresh call itself, so a failed
// refresh can never recursively trigger another refresh attempt.
const refreshClient = axios.create({ baseURL: BASE_URL, withCredentials: true });

let refreshInFlight: Promise<string | null> | null = null;

/** Shared by every concurrent 401 so a burst of requests triggers one refresh call, not N. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Notified once, after a refresh attempt fails, so the app can redirect to /login. */
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(handler: (() => void) | null) {
  onAuthExpired = handler;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(original);
      }
      onAuthExpired?.();
    }

    return Promise.reject(error);
  },
);
