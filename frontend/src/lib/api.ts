/**
 * lib/api.ts
 * 
 * Centralized Axios instance for all frontend API calls.
 * 
 * Automatically attaches:
 *   - Authorization: Bearer <token>
 *   - x-tenant-id  (read from stored user object)
 *   - x-user-id    (read from stored user object)
 * 
 * Usage:
 *   import api from '@/lib/api';
 *   const res = await api.get('/api/users');
 *   const res = await api.post('/api/tickets', { ... });
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/", // Same origin — Next.js API routes
  timeout: 15000, // 15 seconds — prevents pages from hanging indefinitely
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Runs before every request. Reads latest token & user from storage.
api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") return config; // SSR guard

    // 1. Auth token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // 2. Tenant & user context (from stored user object)
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user?.tenantId) {
          config.headers["x-tenant-id"] = user.tenantId;
        }
        if (user?.id || user?._id) {
          config.headers["x-user-id"] = user.id ?? user._id;
        }
        if (user?.role) {
          config.headers["x-role"] = user.role;
        }
        if (user?.name) {
          config.headers["x-user-name"] = user.name;
        }
      } catch {
        // Malformed user object — skip silently
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Handles global errors. 401 → clear session & redirect to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      // Session expired — clear storage and bounce to login
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = "token=; Max-Age=0; path=/;";
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed helpers (optional convenience wrappers) ───────────────────────────

/** GET /api/users — returns array of users for this tenant (owner/manager only) */
export const fetchUsers = () => api.get("/api/users");

/** GET /api/tickets — returns tickets scoped to tenant */
export const fetchTickets = () => api.get("/api/tickets");

/** POST /api/auth/forgot-password */
export const forgotPassword = (email: string) =>
  api.post("/api/auth/forgot-password", { email });

/** POST /api/auth/reset-password */
export const resetPassword = (token: string, newPassword: string) =>
  api.post("/api/auth/reset-password", { token, newPassword });

/** POST /api/auth/logout */
export const logoutApi = () => api.post("/api/auth/logout");
