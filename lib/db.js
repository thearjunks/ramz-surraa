// SQLite database (one file: data/surraa.db) using the SQLite engine built into Node.js 22.13+ (node:sqlite),
// so nothing has to be compiled on Windows. Synchronous + single process + BEGIN IMMEDIATE = every write
// transaction is serialized, so capacity checks and serial numbers can't race.
// ponytail: SQLite is right for one server. To move to MySQL/PostgreSQL, port the SQL in lib/*.js (standard SQL, no ORM).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import site from "@/data/site";
import { hashPassword } from "./security";

export const DATA_DIR = path.join(process.cwd(), "data");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS membership_categories (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, benefits TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, membership_id TEXT UNIQUE, name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nationality TEXT DEFAULT '', civil_enc TEXT, civil_hash TEXT, civil_last4 TEXT,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', category_id INTEGER REFERENCES membership_categories(id),
  membership_status TEXT NOT NULL DEFAULT 'active', account_status TEXT NOT NULL DEFAULT 'active',
  email_verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, last_login TEXT);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_tokens (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, event_code TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT DEFAULT '',
  description TEXT DEFAULT '', date TEXT NOT NULL, start_time TEXT DEFAULT '', end_time TEXT DEFAULT '',
  venue TEXT DEFAULT '', area TEXT DEFAULT '', map_url TEXT DEFAULT '', poster TEXT DEFAULT '', gallery TEXT DEFAULT '[]', lineup TEXT DEFAULT '[]',
  capacity INTEGER NOT NULL DEFAULT 0, reserved INTEGER NOT NULL DEFAULT 0, max_per_booking INTEGER NOT NULL DEFAULT 4, max_per_person INTEGER NOT NULL DEFAULT 4,
  reg_open TEXT DEFAULT '', reg_close TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', members_only INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  internal_rate REAL NOT NULL DEFAULT 0, terms TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, ref TEXT NOT NULL UNIQUE, event_id INTEGER NOT NULL REFERENCES events(id), user_id INTEGER REFERENCES users(id),
  user_type TEXT NOT NULL, name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE, nationality TEXT NOT NULL,
  civil_enc TEXT NOT NULL, civil_hash TEXT NOT NULL, civil_last4 TEXT NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL, page_url TEXT DEFAULT '', access_token TEXT NOT NULL UNIQUE, notes TEXT DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, confirmed_at TEXT, confirmed_by INTEGER REFERENCES users(id));
CREATE INDEX IF NOT EXISTS bookings_event ON bookings(event_id, status);
CREATE TABLE IF NOT EXISTS passes (
  id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL REFERENCES bookings(id), event_id INTEGER NOT NULL REFERENCES events(id),
  serial TEXT NOT NULL UNIQUE, token TEXT NOT NULL UNIQUE, holder TEXT NOT NULL, issued_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid', checked_in_at TEXT, checked_in_by INTEGER REFERENCES users(id));
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL REFERENCES bookings(id), from_status TEXT, to_status TEXT NOT NULL,
  by_user INTEGER REFERENCES users(id), remarks TEXT DEFAULT '', at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payments (
  booking_id INTEGER PRIMARY KEY REFERENCES bookings(id), rate REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid', method TEXT DEFAULT '', received REAL NOT NULL DEFAULT 0, payment_date TEXT DEFAULT '',
  reference TEXT DEFAULT '', remarks TEXT DEFAULT '', updated_by INTEGER REFERENCES users(id), updated_at TEXT);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY, pass_id INTEGER REFERENCES passes(id), serial TEXT, event_id INTEGER, result TEXT NOT NULL,
  by_user INTEGER REFERENCES users(id), at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, channel TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT DEFAULT '', body TEXT NOT NULL,
  status TEXT NOT NULL, error TEXT DEFAULT '', booking_id INTEGER, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity TEXT DEFAULT '', entity_id TEXT DEFAULT '', details TEXT DEFAULT '', at TEXT NOT NULL);
`;

export const now = () => new Date().toISOString();

// columns added after the first release (SQLite can't add UNIQUE columns directly → separate index)
function migrate(db) {
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("username")) db.exec("ALTER TABLE users ADD COLUMN username TEXT");
  if (!cols.includes("request_note")) db.exec("ALTER TABLE users ADD COLUMN request_note TEXT DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username COLLATE NOCASE)");
  const eventCols = db.prepare("PRAGMA table_info(events)").all().map((c) => c.name);
  if (!eventCols.includes("is_hidden")) db.exec("ALTER TABLE events ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0");
}

// The owner's Super Admin account, created once on first run.
// ponytail: initial password as requested by the owner — change it from Admin → Users after first sign-in.
const OWNER = { username: "arjun.sajimon", name: "Arjun Sajimon", email: "arjun.sajimon@admin.surraa.local", mobile: "+96566247474", password: "AK1AK" };
function seedOwner(db) {
  if (db.prepare("SELECT 1 FROM users WHERE role = 'super_admin' OR username = ?").get(OWNER.username)) return;
  db.prepare(`INSERT INTO users (username, name, mobile, email, password_hash, role, email_verified, created_at) VALUES (?,?,?,?,?,'super_admin',1,?)`)
    .run(OWNER.username, OWNER.name, OWNER.mobile, OWNER.email, hashPassword(OWNER.password), now());
}

function seed(db) {
  seedOwner(db);
  if (db.prepare("SELECT COUNT(*) n FROM events").get().n) return;
  const t = now();
  for (const e of site.events || []) {
    const code = nextCode(db, "event", "EVT", 3);
    db.prepare(`INSERT INTO events (event_code, slug, name, category, description, date, start_time, venue, area, map_url, poster, gallery, lineup,
      capacity, max_per_booking, max_per_person, status, terms, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      code, e.slug, e.title, e.category || "", e.short || "", e.start.slice(0, 10), e.start.slice(11, 16), e.venue, e.area,
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(e.mapQuery || e.venue), e.poster, JSON.stringify(e.gallery || []),
      JSON.stringify(e.lineup || []), 1100, 6, 6, "open", DEFAULT_TERMS, t, t);
  }
  db.prepare("INSERT OR IGNORE INTO membership_categories (name, benefits) VALUES (?, ?)").run("Standard", "Faster entry pass requests, booking history, digital membership ID");
}

export const DEFAULT_TERMS = "Entry passes are personal and subject to confirmation by SURRAA Community Association. A request is not an entry pass. Each confirmed pass admits one person once. Valid ID may be requested at the entrance. Venue rules apply.";

// Sequential codes (SCA-2026-000001, EVT001 …) — runs inside the caller's transaction
export function nextCode(db, name, prefix, pad) {
  db.prepare("INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1").run(name);
  const n = db.prepare("SELECT value FROM counters WHERE name = ?").get(name).value;
  return prefix + String(n).padStart(pad, "0");
}

// db.transaction(fn) → callable; calling it (or .immediate()) runs fn inside BEGIN IMMEDIATE … COMMIT,
// rolls back on any error. Nested calls just join the outer transaction.
function addTransactions(db) {
  let depth = 0;
  db.transaction = (fn) => {
    const run = (...args) => {
      if (depth) return fn(...args);
      db.exec("BEGIN IMMEDIATE");
      depth++;
      try { const r = fn(...args); db.exec("COMMIT"); return r; }
      catch (e) { try { db.exec("ROLLBACK"); } catch {} throw e; }
      finally { depth--; }
    };
    run.immediate = run;
    return run;
  };
  return db;
}

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = addTransactions(new DatabaseSync(path.join(DATA_DIR, "surraa.db")));
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA);
  migrate(db);
  db.transaction(() => seed(db))();
  return db;
}

// one connection per server process (survives dev hot-reload)
export const db = globalThis.__surraaDb || (globalThis.__surraaDb = open());
migrate(db); db.transaction(() => seedOwner(db))(); // also runs after a hot reload of an already-open database

export function setting(key, fallback = "") {
  const r = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return r ? r.value : fallback;
}
export function setSetting(key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value ?? ""));
}

export function audit(userId, action, entity = "", entityId = "", details = "") {
  db.prepare("INSERT INTO audit_logs (user_id, action, entity, entity_id, details, at) VALUES (?,?,?,?,?,?)")
    .run(userId ?? null, action, entity, String(entityId ?? ""), typeof details === "string" ? details : JSON.stringify(details), now());
}
