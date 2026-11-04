// Sessions (httpOnly cookie → hashed token in DB) and role-based permissions.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, now } from "./db";
import { token, sha256 } from "./security";

export const ROLES = {
  member: "Registered Member",
  super_admin: "Super Administrator",
  admin: "Administrator",
  editor: "Editor",
  content_manager: "Content Manager",
  event_manager: "Event Manager",
  booking_staff: "Booking Staff",
  finance: "Finance Staff",
  checkin: "Entry Verification Staff",
};
const P = {
  super_admin: ["*"],
  admin: ["*"], // same as super admin, except they can't change super admin accounts (checked in saveUser)
  editor: ["content"],
  content_manager: ["content"],
  event_manager: ["dashboard", "bookings.view", "bookings.update", "bookings.confirm", "events", "checkin", "reports", "analytics", "content"],
  booking_staff: ["dashboard", "bookings.view", "bookings.update", "checkin", "reports", "analytics"],
  finance: ["dashboard", "bookings.view", "payments", "reports", "reports.finance", "analytics"],
  checkin: ["checkin"],
};
// "civil.view", "reports.sensitive", "users", "settings", "audit" are admin / super admin only
export const STAFF_ROLES = Object.keys(ROLES).filter((r) => r !== "member");
export const can = (user, perm) => !!user && (P[user.role] || []).some((p) => p === "*" || p === perm);
export const isStaff = (user) => !!user && user.role !== "member";

const COOKIE = "sca_session";
const DAYS = 30;

export async function startSession(userId) {
  const t = token(32);
  const exp = new Date(Date.now() + DAYS * 864e5).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)").run(sha256(t), userId, exp);
  db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(now(), userId);
  (await cookies()).set(COOKIE, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1", path: "/", maxAge: DAYS * 86400 });
}

export async function endSession() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(t));
  c.delete(COOKIE);
}

export async function currentUser() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const u = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha256(t), now());
  return u && u.account_status === "active" ? u : null;
}

export async function requireUser(next = "/account/") {
  const u = await currentUser();
  if (!u) redirect("/sign-in/?next=" + encodeURIComponent(next));
  return u;
}

export async function requirePerm(perm) {
  const u = await currentUser();
  if (!u || !isStaff(u)) redirect("/admin/login/");
  if (perm && !can(u, perm)) redirect("/admin/?denied=1");
  return u;
}

export async function clientIp() {
  const h = await headers();
  // last X-Forwarded-For entry = the one added by our own proxy (earlier entries can be faked by the client)
  return h.get("x-real-ip") || (h.get("x-forwarded-for") || "").split(",").pop().trim() || "local";
}
export async function siteUrl() {
  const h = await headers();
  return process.env.SITE_URL || `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;
}
