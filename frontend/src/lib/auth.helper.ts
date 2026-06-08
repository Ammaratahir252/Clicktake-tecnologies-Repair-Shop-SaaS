import Cookies from "js-cookie";

export const isLoggedIn = (): boolean => {
  if (typeof window === "undefined") return false;
  // Only check Cookie for the absolute truth
  return !!Cookies.get("token");
};

export const setToken = (token: string, userData?: any): void => {
  if (typeof window !== "undefined") {
    // Save to Cookie for Middleware
    Cookies.set("token", token, { expires: 7, path: "/" });
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