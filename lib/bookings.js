// Booking engine: capacity, requests, status workflow, official passes, check-in.
import { db, now, nextCode, audit } from "./db";
import { encrypt, civilHash, token } from "./security";

export const STATUS = {
  pending: "Pending Confirmation",
  under_review: "Under Review",
  contacted: "Contacted",
  awaiting: "Awaiting Completion",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
  checked_in: "Checked In",
};
// statuses that hold capacity
export const ACTIVE = ["pending", "under_review", "contacted", "awaiting", "confirmed", "checked_in"];
const IN = (arr) => arr.map((s) => `'${s}'`).join(",");
export const ADMIN_SETTABLE = ["under_review", "contacted", "awaiting", "confirmed", "rejected", "cancelled", "expired"];

export const EVENT_STATUS = { draft: "Draft", upcoming: "Upcoming", open: "Registration Open", closed: "Registration Closed", full: "Fully Booked", completed: "Completed", cancelled: "Cancelled" };

// ---------- time (Kuwait = UTC+3, no DST) ----------
export const kwDate = (localYmdHm) => new Date(`${localYmdHm.length === 10 ? localYmdHm + "T00:00" : localYmdHm}:00+03:00`);
export const eventStart = (e) => kwDate(`${e.date}T${e.start_time || "00:00"}`);
export const eventEnd = (e) => (e.end_time ? kwDate(`${e.date}T${e.end_time}`) : new Date(eventStart(e).getTime() + 6 * 3600e3));
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Kuwait", weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtDT = (d) => (d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
export const fmtTime = (hm) => { if (!hm) return ""; const [h, m] = hm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export const kwToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

// ---------- events ----------
export const getEvent = (slugOrId) => db.prepare("SELECT * FROM events WHERE slug = ? OR event_code = ? OR id = ?").get(String(slugOrId), String(slugOrId), Number(slugOrId) || -1);

export function eventStats(eventId) {
  const r = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status IN (${IN(ACTIVE)}) THEN quantity END), 0) used,
      COALESCE(SUM(CASE WHEN status IN ('confirmed','checked_in') THEN quantity END), 0) confirmed,
      COALESCE(SUM(CASE WHEN status IN ('pending','under_review','contacted','awaiting') THEN quantity END), 0) pending,
      COUNT(*) requests FROM bookings WHERE event_id = ?`).get(eventId);
  const e = db.prepare("SELECT capacity, reserved FROM events WHERE id = ?").get(eventId);
  return { ...r, capacity: e.capacity, reserved: e.reserved, available: Math.max(0, e.capacity - e.reserved - r.used),
    checkedIn: db.prepare("SELECT COUNT(*) n FROM passes WHERE event_id = ? AND checked_in_at IS NOT NULL").get(eventId).n };
}

// what the public sees + whether requests are accepted right now
export function eventState(e, stats = eventStats(e.id)) {
  const t = Date.now();
  if (e.is_hidden) return { key: "draft", open: false };
  if (e.status === "cancelled") return { key: "cancelled", open: false };
  if (e.status === "completed" || eventEnd(e).getTime() < t) return { key: "completed", open: false };
  if (e.status === "draft") return { key: "draft", open: false };
  if (stats.available <= 0 && e.capacity > 0) return { key: "full", open: false };
  if (e.status === "closed") return { key: "closed", open: false };
  if (e.status === "upcoming") return { key: "upcoming", open: false };
  if (e.reg_open && kwDate(e.reg_open).getTime() > t) return { key: "upcoming", open: false };
  if (e.reg_close && kwDate(e.reg_close).getTime() < t) return { key: "closed", open: false };
  return { key: "open", open: true };
}

export const publicEvents = (past = false) => db.prepare("SELECT * FROM events WHERE status != 'draft' AND is_hidden = 0 ORDER BY date " + (past ? "DESC" : "ASC")).all()
  .filter((e) => (eventEnd(e).getTime() < Date.now() || e.status === "completed") === past);

// ---------- requests ----------
export class BookingError extends Error {}
export const FULL_MSG = "Entry pass requests for this event are currently closed as the available capacity has been reached. Please check back for future updates.";

export function createBooking({ event, user, name, mobile, email, nationality, civil, quantity, pageUrl }) {
  const civil_hash = civilHash(civil);
  const tx = db.transaction(() => {
    const e = db.prepare("SELECT * FROM events WHERE id = ?").get(event.id); // re-read inside the transaction
    const stats = eventStats(e.id);
    const st = eventState(e, stats);
    if (!st.open) throw new BookingError(st.key === "full" ? FULL_MSG : "Entry pass requests for this event are not open.");
    if (e.members_only && !user) throw new BookingError("This event is for registered members. Please sign in or create a free account.");
    if (quantity < 1 || quantity > e.max_per_booking) throw new BookingError(`You can request between 1 and ${e.max_per_booking} entry passes per booking.`);
    if (quantity > stats.available) throw new BookingError(stats.available ? `Only ${stats.available} entry passes are currently available. Please reduce the number of passes.` : FULL_MSG);
    // duplicate / per-person limit: same email, mobile or Civil ID on this event
    const mine = db.prepare(`SELECT ref, quantity FROM bookings WHERE event_id = ? AND status IN (${IN(ACTIVE)}) AND (email = ? OR mobile = ? OR civil_hash = ?)`).all(e.id, email, mobile, civil_hash);
    const held = mine.reduce((s, b) => s + b.quantity, 0);
    if (mine.length && held + quantity > e.max_per_person)
      throw new BookingError(`You already have an active request for this event (${mine.map((b) => b.ref).join(", ")}). Track it with your reference, or contact us to change it.`);
    const year = e.date.slice(0, 4);
    const ref = nextCode(db, "booking-" + year, `SCA-${year}-`, 6);
    const t = now();
    const id = db.prepare(`INSERT INTO bookings (ref, event_id, user_id, user_type, name, mobile, email, nationality, civil_enc, civil_hash, civil_last4,
        quantity, status, page_url, access_token, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref, e.id, user?.id ?? null, user ? "member" : "guest", name, mobile, email, nationality, encrypt(civil), civil_hash, civil.slice(-4),
        quantity, "pending", pageUrl || "", token(24), t, t).lastInsertRowid;
    db.prepare("INSERT INTO status_history (booking_id, from_status, to_status, by_user, remarks, at) VALUES (?,?,?,?,?,?)").run(id, null, "pending", user?.id ?? null, "Request submitted", t);
    db.prepare("INSERT INTO payments (booking_id, rate, total) VALUES (?,?,?)").run(id, e.internal_rate, e.internal_rate * quantity);
    return db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  });
  return tx.immediate(); // BEGIN IMMEDIATE: one writer at a time → no overbooking
}

export function changeStatus(bookingId, to, byUser, remarks = "") {
  if (!STATUS[to]) throw new BookingError("Unknown status");
  return db.transaction(() => {
    const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    if (!b) throw new BookingError("Booking not found");
    if (b.status === to) return b;
    if (b.status === "checked_in") throw new BookingError("This booking is already checked in.");
    const wasActive = ACTIVE.includes(b.status), willBeActive = ACTIVE.includes(to);
    if (!wasActive && willBeActive) { // re-opening a rejected/cancelled request must fit capacity again
      const s = eventStats(b.event_id);
      if (b.quantity > s.available) throw new BookingError(`Not enough capacity to reopen (${s.available} available).`);
    }
    const t = now();
    if (to === "confirmed") {
      const e = db.prepare("SELECT * FROM events WHERE id = ?").get(b.event_id);
      const have = db.prepare("SELECT COUNT(*) n FROM passes WHERE booking_id = ?").get(b.id).n;
      // re-confirming a previously revoked booking: same serials, fresh QR tokens (old QR codes stay dead)
      for (const p of db.prepare("SELECT id FROM passes WHERE booking_id = ? AND status = 'revoked'").all(b.id))
        db.prepare("UPDATE passes SET status = 'valid', token = ?, issued_at = ? WHERE id = ?").run(token(24), t, p.id);
      for (let i = have; i < b.quantity; i++) {
        const serial = nextCode(db, `serial-${e.event_code}-${e.date.slice(0, 4)}`, `SCA-${e.event_code}-${e.date.slice(0, 4)}-`, 4);
        db.prepare("INSERT INTO passes (booking_id, event_id, serial, token, holder, issued_at) VALUES (?,?,?,?,?,?)").run(b.id, b.event_id, serial, token(24), b.name, t);
      }
      db.prepare("UPDATE bookings SET confirmed_at = ?, confirmed_by = ? WHERE id = ?").run(t, byUser?.id ?? null, b.id);
    }
    if (["rejected", "cancelled", "expired"].includes(to)) db.prepare("UPDATE passes SET status = 'revoked' WHERE booking_id = ?").run(b.id);
    db.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(to, t, b.id);
    db.prepare("INSERT INTO status_history (booking_id, from_status, to_status, by_user, remarks, at) VALUES (?,?,?,?,?,?)").run(b.id, b.status, to, byUser?.id ?? null, remarks, t);
    audit(byUser?.id, "booking.status", "booking", b.ref, `${b.status} → ${to}${remarks ? " · " + remarks : ""}`);
    return db.prepare("SELECT * FROM bookings WHERE id = ?").get(b.id);
  }).immediate();
}

export function reissuePass(passId, byUser) {
  const p = db.prepare("SELECT * FROM passes WHERE id = ?").get(passId);
  if (!p || p.checked_in_at) throw new BookingError("Pass not found or already used.");
  db.prepare("UPDATE passes SET token = ?, issued_at = ?, status = 'valid' WHERE id = ?").run(token(24), now(), passId);
  audit(byUser?.id, "pass.reissue", "pass", p.serial, "Old QR code revoked, new verification token issued");
}

// ---------- check-in ----------
export function verifyPass(raw) {
  const tok = String(raw || "").trim().replace(/^.*[?&/:]t?=?([A-Za-z0-9_-]{20,})$/, "$1");
  const p = db.prepare(`SELECT p.*, b.ref, b.status booking_status, b.quantity, e.name event_name, e.event_code, e.date, e.start_time
    FROM passes p JOIN bookings b ON b.id = p.booking_id JOIN events e ON e.id = p.event_id WHERE p.token = ? OR p.serial = ?`).get(tok, tok);
  if (!p) return { result: "invalid" };
  if (p.status === "revoked" || !["confirmed", "checked_in"].includes(p.booking_status)) return { result: "revoked", pass: p };
  if (p.checked_in_at) return { result: "used", pass: p };
  return { result: "valid", pass: p, wrongDay: p.date !== kwToday() };
}

export function checkIn(passId, byUser) {
  return db.transaction(() => {
    const t = now();
    const r = db.prepare("UPDATE passes SET checked_in_at = ?, checked_in_by = ? WHERE id = ? AND checked_in_at IS NULL AND status = 'valid'").run(t, byUser.id, passId);
    const p = db.prepare("SELECT * FROM passes WHERE id = ?").get(passId);
    const result = r.changes ? "checked_in" : p?.checked_in_at ? "already_used" : "denied";
    db.prepare("INSERT INTO checkins (pass_id, serial, event_id, result, by_user, at) VALUES (?,?,?,?,?,?)").run(passId, p?.serial, p?.event_id, result, byUser.id, t);
    if (r.changes) {
      const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(p.booking_id);
      if (b.status === "confirmed") {
        db.prepare("UPDATE bookings SET status = 'checked_in', updated_at = ? WHERE id = ?").run(t, b.id);
        db.prepare("INSERT INTO status_history (booking_id, from_status, to_status, by_user, remarks, at) VALUES (?,?,?,?,?,?)").run(b.id, "confirmed", "checked_in", byUser.id, "Pass " + p.serial + " scanned", t);
      }
    }
    return { result, pass: p };
  }).immediate();
}

// Requests still waiting when their event is over → Expired (runs lazily when the admin opens bookings)
export function sweepExpired() {
  const rows = db.prepare(`SELECT b.id, e.date, e.start_time, e.end_time FROM bookings b JOIN events e ON e.id = b.event_id
    WHERE b.status IN ('pending','under_review','contacted','awaiting')`).all();
  for (const r of rows) if (eventEnd(r).getTime() < Date.now()) changeStatus(r.id, "expired", null, "Event finished before confirmation");
}

export const passesFor = (bookingId) => db.prepare("SELECT * FROM passes WHERE booking_id = ? ORDER BY serial").all(bookingId);
export const historyFor = (bookingId) => db.prepare(`SELECT h.*, u.name by_name FROM status_history h LEFT JOIN users u ON u.id = h.by_user WHERE booking_id = ? ORDER BY h.id`).all(bookingId);

// Event row → shape used by public components (Countdown, cards)
export function view(e) {
  const stats = eventStats(e.id);
  const state = eventState(e, stats);
  return {
    ...e, title: e.name, start: eventStart(e).toISOString(), end: e.end_time ? eventEnd(e).toISOString() : "",
    dateLabel: fmtDate(eventStart(e)), timeLabel: e.start_time ? "Starts " + fmtTime(e.start_time) + (e.end_time ? " – " + fmtTime(e.end_time) : "") : "",
    lineupArr: JSON.parse(e.lineup || "[]"), galleryArr: JSON.parse(e.gallery || "[]"), state, stateLabel: EVENT_STATUS[state.key],
    availability: availabilityText(e, stats, state),
  };
}
// Public capacity hint — never exact numbers or money
function availabilityText(e, s, st) {
  if (!st.open) return st.key === "full" ? FULL_MSG : "";
  const left = s.available / Math.max(1, e.capacity - e.reserved);
  return left < 0.1 ? "Almost full — very limited entry passes remaining." : left < 0.3 ? "Filling fast — limited entry passes remaining." : "Entry pass requests are open.";
}

const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export const gcal = (e) => "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.name) +
  "&dates=" + stamp(eventStart(e)) + "/" + stamp(eventEnd(e)) + "&location=" + encodeURIComponent(`${e.venue}, ${e.area}`);
