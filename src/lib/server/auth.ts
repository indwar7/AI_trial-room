/** Passwords, sessions and the admin key. Server only. */

import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import type { StoreUser } from "./store";

const SESSION_DAYS = 30;
/** No look-alike characters (i, l, o, 0, 1), since passwords are read out and typed. */
const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyz23456789";
const PASSWORD_LENGTH = 10;

function secret(name: "SESSION_SECRET" | "ADMIN_KEY"): string {
  const value = process.env[name];
  if (!value || value.length < 24) throw new Error(`${name} is not set on the server.`);
  return value;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

export function newPassword(): string {
  return Array.from(
    { length: PASSWORD_LENGTH },
    () => PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)],
  ).join("");
}

export function newId(): string {
  return randomBytes(9).toString("hex");
}

function sign(body: string): string {
  return createHmac("sha256", secret("SESSION_SECRET")).update(body).digest("base64url");
}

/** Changes when the password changes, which ends every older session. */
function passwordMark(user: StoreUser): string {
  return user.hash.slice(0, 12);
}

export function issueSession(user: StoreUser): string {
  const body = Buffer.from(
    JSON.stringify({
      u: user.username,
      v: passwordMark(user),
      exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** The login ID a session token was issued to, once the signature and date check out. */
export function readSession(token: string): { username: string; mark: string } | null {
  const [body, mac] = token.split(".");
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const { u, v, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      u?: unknown;
      v?: unknown;
      exp?: unknown;
    };
    if (typeof u !== "string" || typeof v !== "string" || typeof exp !== "number") return null;
    if (exp < Date.now()) return null;
    return { username: u, mark: v };
  } catch {
    return null;
  }
}

export function sessionStillGood(user: StoreUser | null, mark: string): user is StoreUser {
  return !!user && user.active && safeEqual(passwordMark(user), mark);
}

export function isAdmin(request: Request): boolean {
  return safeEqual(request.headers.get("x-admin-key") ?? "", secret("ADMIN_KEY"));
}
