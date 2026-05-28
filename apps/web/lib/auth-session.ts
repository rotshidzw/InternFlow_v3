import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SESSION_COOKIE = "if_session";
const USER_COOKIE = "if_user";
const WORKSPACE_COOKIE = "if_workspace";
const IMPERSONATION_COOKIE = "if_impersonation";
const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  v: number;
  email: string;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV !== "production") {
    return "internflow-local-session-secret";
  }
  return null;
}

function sign(rawPayload: string, secret: string) {
  return createHmac("sha256", secret).update(rawPayload).digest("base64url");
}

function encode(payload: SessionPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

function decode(token: string, secret: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const provided = Buffer.from(signature, "utf8");
  const actual = Buffer.from(expected, "utf8");
  if (provided.length !== actual.length) return null;
  if (!timingSafeEqual(provided, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (parsed.v !== SESSION_VERSION) return null;
    if (typeof parsed.email !== "string" || !parsed.email.includes("@")) return null;
    if (typeof parsed.exp !== "number") return null;
    if (Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cookieSecurity() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

export function getAuthenticatedEmailFromCookies() {
  const cookieStore = cookies();
  const rawEmail = cookieStore.get(USER_COOKIE)?.value?.toLowerCase();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const secret = getSessionSecret();

  if (!rawEmail || !token || !secret) return null;
  const payload = decode(token, secret);
  if (!payload) return null;
  if (payload.email.toLowerCase() !== rawEmail) return null;
  return rawEmail;
}

export function setAuthenticatedSessionCookies(response: NextResponse, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET or NEXTAUTH_SECRET is required in production");
  }

  const now = Date.now();
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    email: normalizedEmail,
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
  };
  const token = encode(payload, secret);
  const baseCookie = cookieSecurity();

  response.cookies.set(USER_COOKIE, normalizedEmail, {
    ...baseCookie,
    maxAge: SESSION_TTL_SECONDS,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    ...baseCookie,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAuthenticatedSessionCookies(response: NextResponse) {
  const expiredAt = new Date(0);
  const baseCookie = cookieSecurity();
  response.cookies.set(USER_COOKIE, "", { ...baseCookie, expires: expiredAt });
  response.cookies.set(SESSION_COOKIE, "", { ...baseCookie, expires: expiredAt });
  response.cookies.set(WORKSPACE_COOKIE, "", { ...baseCookie, expires: expiredAt });
  response.cookies.set(IMPERSONATION_COOKIE, "", { ...baseCookie, expires: expiredAt });
}
