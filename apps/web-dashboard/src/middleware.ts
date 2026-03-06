import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "token";

export const config = {
  matcher: ["/", "/signup", "/dashboard", "/dashboard/:path*"],
};

/**
 * Auth is cookie-based only. Middleware runs on the server and cannot read localStorage.
 * After login, setAuthCookie(token) must set the "token" cookie so this middleware can allow /dashboard.
 */
export async function middleware(request: NextRequest) {
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  try {
    if (token.includes("%")) token = decodeURIComponent(token);
  } catch {
    token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  }

  const secret = process.env.JWT_SECRET;
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
  const isPublicAuth = request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/signup";

  const clearAndRedirectToLogin = () => {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    res.headers.set("X-Auth-Status", "redirect-to-login");
    return res;
  };

  const redirectToDashboard = () => {
    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    res.headers.set("X-Auth-Status", "redirect-to-dashboard");
    return res;
  };

  const addAuthHeader = (res: NextResponse, value: string) => {
    res.headers.set("X-Auth-Status", value);
    return res;
  };

  if (!secret?.trim()) {
    if (isProtected) return clearAndRedirectToLogin();
    return addAuthHeader(NextResponse.next(), "no-jwt-secret");
  }

  if (!token) {
    if (isProtected) return clearAndRedirectToLogin();
    return addAuthHeader(NextResponse.next(), "no-cookie");
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    if (isProtected) return clearAndRedirectToLogin();
    if (isPublicAuth) {
      const res = NextResponse.next();
      res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return addAuthHeader(res, "invalid-token");
    }
    return addAuthHeader(NextResponse.next(), "invalid-token");
  }

  if (isPublicAuth) return redirectToDashboard();
  return addAuthHeader(NextResponse.next(), "ok");
}
