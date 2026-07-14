import Cookies from "js-cookie";

/** Decode the `exp` claim (seconds since epoch) from a JWT, or null if unreadable. */
const getTokenExp = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
};

export const isLoggedIn = (): boolean => {
  if (typeof window === "undefined") return false;
  // Only check Cookie for the absolute truth
  const token = Cookies.get("token");
  if (!token) return false;
  // A cookie holding an expired JWT is a dead session — the middleware will
  // reject it anyway, so clear it here to keep client and server in agreement
  // (otherwise pages "think" they're logged in and redirect into a login bounce).
  const exp = getTokenExp(token);
  if (exp !== null && exp * 1000 <= Date.now()) {
    removeToken();
    return false;
  }
  return true;
};

export const setToken = (token: string, userData?: any): void => {
  if (typeof window !== "undefined") {
    // Cookie lifetime must match the JWT's own expiry — a longer-lived cookie
    // would keep serving a dead token after the session times out.
    const exp = getTokenExp(token);
    const expires = exp ? new Date(exp * 1000) : 1 / 24; // fallback: 1 hour
    // Save to Cookie for Middleware
    Cookies.set("token", token, { expires, path: "/" });
    // Save to LocalStorage for the UI
    localStorage.setItem("token", token);
    if (userData) localStorage.setItem("user", JSON.stringify(userData));
  }
};

export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    // 1. Delete the Cookie (Crucial for Guard)
    Cookies.remove("token", { path: "/" });

    // 2. Wipe all local data
    localStorage.clear();
    sessionStorage.clear();

    // 3. Force browser to forget the cookie header
    document.cookie = "token=; Max-Age=0; path=/; domain=" + window.location.hostname;
  }
};
