// Simple auth utilities for admin access
// Credentials are stored in environment variables

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
const AUTH_KEY = "badminton_admin_auth";

export function verifyCredentials(username, password) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function setAuthSession() {
  if (typeof window === "undefined") return;
  const token = btoa(JSON.stringify({ 
    authenticated: true, 
    timestamp: Date.now(),
    expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  }));
  sessionStorage.setItem(AUTH_KEY, token);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  const token = sessionStorage.getItem(AUTH_KEY);
  if (!token) return false;
  
  try {
    const data = JSON.parse(atob(token));
    if (data.expiry < Date.now()) {
      clearAuthSession();
      return false;
    }
    return data.authenticated === true;
  } catch {
    return false;
  }
}
