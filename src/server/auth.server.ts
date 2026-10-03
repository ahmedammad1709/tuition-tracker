// Server-only: password hashing, DB-backed sessions and the auth guard.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { appOwner, sessions } from "../../drizzle/schema";
import { db } from "./db.server";

const SESSION_COOKIE = "tft_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days — stays logged in on the device
const KEY_LENGTH = 64;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt — no external dependency)
// ---------------------------------------------------------------------------
function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length === 0) return false;
  const derived = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(expected, derived);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db
    .insert(sessions)
    .values({ tokenHash: hashToken(token), expiresAt: expiresAt.toISOString() });
  setCookie(SESSION_COOKIE, token, cookieOptions());
}

/** Returns the signed-in owner, or null when there is no valid session. */
export async function getSessionUser(): Promise<{ email: string } | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const rows = await db
    .select({ email: appOwner.email })
    .from(sessions)
    .innerJoin(appOwner, eq(appOwner.id, sessions.ownerId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  return rows[0] ?? null;
}

/** Throws unless a valid owner session exists. Call at the top of every data operation. */
export async function requireOwner(): Promise<{ email: string }> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Unauthorized: please sign in again.");
  return user;
}

// ---------------------------------------------------------------------------
// Owner lifecycle
// ---------------------------------------------------------------------------
export async function ownerExists(): Promise<boolean> {
  const rows = await db.select({ id: appOwner.id }).from(appOwner).limit(1);
  return rows.length > 0;
}

export async function registerOwner(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    throw new AuthError("Enter a valid email address.");
  if (password.length < 8) throw new AuthError("Password must be at least 8 characters.");
  if (await ownerExists()) throw new AuthError("An owner account already exists. Please sign in.");

  const passwordHash = await hashPassword(password);
  await db.insert(appOwner).values({ email: normalizedEmail, passwordHash });
  await createSession();
}

export async function login(email: string, password: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db.select().from(appOwner).limit(1);
  const owner = rows[0];
  if (!owner || owner.email !== normalizedEmail) return false;
  if (!(await verifyPassword(password, owner.passwordHash))) return false;
  await createSession();
  return true;
}

export async function logout(): Promise<void> {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = await requireOwner();
  if (newPassword.length < 8) throw new AuthError("New password must be at least 8 characters.");
  const rows = await db.select().from(appOwner).where(eq(appOwner.email, user.email)).limit(1);
  const owner = rows[0];
  if (!owner || !(await verifyPassword(currentPassword, owner.passwordHash))) {
    throw new AuthError("Current password is incorrect.");
  }
  await db
    .update(appOwner)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(appOwner.id, owner.id));
}
