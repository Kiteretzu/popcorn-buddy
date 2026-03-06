const AUTH_COOKIE_NAME = "token";
const MAX_AGE_DAYS = 7;

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  // JWT is cookie-safe (base64url + dots); encoding would break verification in middleware
  let cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    cookie += "; Secure";
  }
  document.cookie = cookie;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export { AUTH_COOKIE_NAME };
