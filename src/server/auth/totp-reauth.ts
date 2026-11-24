import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "hos_cms_totp_setup_reauth";
const sessionCookieName = "hos_cms_session";
const lifetimeSeconds = 5 * 60;

function signingKey() {
  const value = process.env.TOTP_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("TOTP_ENCRYPTION_KEY must be a 32-byte hex key");
  return Buffer.from(value, "hex");
}

function signature(userId: string, sessionToken: string, expiresAt: number) {
  return createHmac("sha256", signingKey())
    .update(`totp-setup-reauth:${userId}:${sessionToken}:${expiresAt}`)
    .digest("base64url");
}

export async function grantTotpSetupAccess(userId: string) {
  const store = await cookies();
  const sessionToken = store.get(sessionCookieName)?.value;
  if (!sessionToken) throw new Error("SESSION_REQUIRED");
  const expiresAt = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  store.set(cookieName, `${expiresAt}.${signature(userId, sessionToken, expiresAt)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: lifetimeSeconds,
  });
}

export async function hasTotpSetupAccess(userId: string) {
  const store = await cookies();
  const sessionToken = store.get(sessionCookieName)?.value;
  const proof = store.get(cookieName)?.value;
  if (!sessionToken || !proof) return false;
  const [expiresText, received] = proof.split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !received || !/^[A-Za-z0-9_-]{43}$/.test(received)) return false;
  const expected = Buffer.from(signature(userId, sessionToken, expiresAt));
  return timingSafeEqual(expected, Buffer.from(received));
}

export async function clearTotpSetupAccess() {
  (await cookies()).delete(cookieName);
}
