// Secrets, password hashing, Civil ID encryption, tokens, rate limiting. Node crypto only.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./data-path";

// Master secret: env SURRAA_SECRET, else data/secret.key (created on first run).
// BACK THIS FILE UP with the database — without it encrypted Civil IDs can't be read.
function loadSecret() {
  if (process.env.SURRAA_SECRET) return Buffer.from(process.env.SURRAA_SECRET, "base64");
  const f = path.join(DATA_DIR, "secret.key");
  if (!fs.existsSync(f)) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(f, crypto.randomBytes(32).toString("base64"), { mode: 0o600 }); }
  return Buffer.from(fs.readFileSync(f, "utf8").trim(), "base64");
}
const MASTER = globalThis.__surraaSecret || (globalThis.__surraaSecret = loadSecret());
const ENC_KEY = crypto.createHmac("sha256", MASTER).update("civil-id-encryption").digest();
const HASH_KEY = crypto.createHmac("sha256", MASTER).update("civil-id-lookup").digest();

// AES-256-GCM: iv.tag.ciphertext (base64)
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decrypt(blob) {
  if (!blob) return "";
  const [iv, tag, enc] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
// keyed hash so duplicate Civil IDs can be detected without decrypting
export const civilHash = (civil) => crypto.createHmac("sha256", HASH_KEY).update(String(civil)).digest("hex");
export const maskCivil = (last4) => (last4 ? "•••••••• " + last4 : "");

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${h.toString("base64")}`;
}
export function verifyPassword(pw, stored) {
  const [, s, h] = String(stored).split("$");
  if (!s || !h) return false;
  const want = Buffer.from(h, "base64");
  const got = crypto.scryptSync(pw, Buffer.from(s, "base64"), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}

export const token = (bytes = 24) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// ponytail: in-memory rate limit — per process, resets on restart. Move to the DB/Redis if you run several servers.
const hits = globalThis.__surraaHits || (globalThis.__surraaHits = new Map());
export function rateLimit(key, max, windowMs) {
  const t = Date.now();
  const arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
  arr.push(t); hits.set(key, arr);
  return arr.length <= max;
}

// Kuwait Civil ID: 12 digits
export const validCivil = (v) => /^\d{12}$/.test(v);
export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const validMobile = (v) => /^\+?[\d\s-]{8,16}$/.test(v);
export const cleanMobile = (v) => String(v).replace(/[^\d+]/g, "");
