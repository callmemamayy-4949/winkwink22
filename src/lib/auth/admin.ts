import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";

const COOKIE_NAME = "wink_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const HASH_ITERATIONS = 310000;
const HASH_KEYLEN = 32;
const HASH_DIGEST = "sha256";

interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
}

export interface AdminSession {
  username: string;
  expiresAt: number;
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY for admin sessions.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodePayload(session: AdminSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function encodeSession(session: AdminSession) {
  const payload = encodePayload(session);
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined): AdminSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!parsed.username || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("base64url");
  return `pbkdf2:${HASH_DIGEST}:${HASH_ITERATIONS}:${salt}:${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string) {
  const [scheme, digest, iterationsText, salt, expected] = storedHash.split(":");
  if (scheme !== "pbkdf2" || digest !== HASH_DIGEST || !iterationsText || !salt || !expected) {
    return false;
  }

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;

  const actual = pbkdf2Sync(password, salt, iterations, HASH_KEYLEN, digest).toString("base64url");
  return safeEqual(actual, expected);
}

export async function getAdminUser(username: string) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, password_hash, is_active")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as AdminUserRow | null;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function setAdminSession(username: string) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession({ username, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
