// Auth utilities - client side only handles session storage
// Actual credential verification happens server-side via /api/auth

const AUTH_KEY = "badminton_admin_auth";

export async function verifyCredentials(username, password) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
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
