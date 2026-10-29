import { randomBytes } from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { decrypt, sha256 } from "./crypto";
import type { UserDoc } from "./db";

const PERIOD = 30;

const make = (secret: string, label: string) =>
  new OTPAuth.TOTP({ issuer: "ToDo Next", label, algorithm: "SHA1", digits: 6, period: PERIOD, secret: OTPAuth.Secret.fromBase32(secret) });

export function newSecret() {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export async function setupPayload(secret: string, email: string) {
  const uri = make(secret, email).toString();
  return { uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret };
}

/** Checks a 6-digit code (±1 step of clock drift). Returns the matched step, or null. */
export function checkCode(secret: string, code: string, lastStep = 0): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const totp = make(secret, "x");
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / PERIOD) + delta;
  return step > lastStep ? step : null; // reject replays of an already-used code
}

export const userSecret = (u: UserDoc) => (u.totpSecret ? decrypt(u.totpSecret) : null);

/** 8 codes like "a1b2-c3d4"; only the hashes are stored. */
export function newRecoveryCodes() {
  const plain = Array.from({ length: 8 }, () => {
    const h = randomBytes(4).toString("hex");
    return `${h.slice(0, 4)}-${h.slice(4)}`;
  });
  return { plain, hashed: plain.map((c) => sha256(c)) };
}

export const normalizeRecovery = (c: string) => c.trim().toLowerCase().replace(/\s/g, "");
