"use server";
// Admin server actions. Every action re-checks the signed-in user's permission.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import { db, now, nextCode, audit, setSetting, DEFAULT_TERMS, DATA_DIR } from "./db";
import { currentUser, can, isStaff, siteUrl, clientIp, ROLES } from "./auth";
import { hashPassword, decrypt, validEmail, validMobile, cleanMobile, token, rateLimit } from "./security";
import { changeStatus, reissuePass, verifyPass, checkIn, eventStats, STATUS, BookingError, ACTIVE, fmtDate, eventStart } from "./bookings";
import { sendEmail, sendWhatsApp, adminWhatsApp } from "./notify";
import { passesPdf } from "./pdf";
import { readPassHolders, holdersForBooking, holderName } from "./pass-holders";
import site from "@/data/site";

const f = (fd, k) => String(fd.get(k) ?? "").trim();
async function staff(perm) {
  const u = await currentUser();
  if (!u || !isStaff(u) || (perm && !can(u, perm))) throw new Error("Not allowed");
  return u;
}
const back = (p) => { revalidatePath(p); redirect(p); };

// ---------- staff access requests (public form on the admin sign-in screen) ----------
const validUsername = (v) => /^[a-z0-9._-]{3,32}$/i.test(v);
const REQUESTABLE = ["admin", "editor", "content_manager", "event_manager", "booking_staff", "finance", "checkin"];

export async function requestAccess(_, fd) {
  const v = { name: f(fd, "name"), username: f(fd, "username").toLowerCase(), email: f(fd, "email").toLowerCase(), mobile: cleanMobile(f(fd, "mobile")), role: f(fd, "role"), note: f(fd, "note") };
  const pw = f(fd, "password");
  if (f(fd, "website")) return { error: "Please try again.", values: v };
  if (!rateLimit("access:" + (await clientIp()), 3, 3600e3)) return { error: "Too many requests. Please try again later.", values: v };
  if (!v.name || !validEmail(v.email) || !validMobile(v.mobile)) return { error: "Please enter your name, a valid email and mobile number.", values: v };
  if (!validUsername(v.username)) return { error: "Username: 3–32 letters, numbers, dots, dashes or underscores.", values: v };
  if (!REQUESTABLE.includes(v.role)) return { error: "Please choose the access you need.", values: v };
  if (pw.length < 8) return { error: "Password must be at least 8 characters.", values: v };
  if (pw !== f(fd, "password2")) return { error: "Passwords do not match.", values: v };
  if (db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE OR email = ?").get(v.username, v.email)) return { error: "This username or email is already registered.", values: v };
  const id = db.prepare(`INSERT INTO users (username, name, email, mobile, password_hash, role, account_status, request_note, created_at) VALUES (?,?,?,?,?,?,'pending',?,?)`)
    .run(v.username, v.name, v.email, v.mobile, hashPassword(pw), v.role, v.note, now()).lastInsertRowid;
  audit(id, "access.request", "user", v.username, `${ROLES[v.role]} · ${v.note}`);
  await sendWhatsApp(adminWhatsApp(), `*SURRAA ADMIN – ACCESS REQUEST*\nName: ${v.name}\nUsername: ${v.username}\nRequested: ${ROLES[v.role]}\nApprove: ${await siteUrl()}/admin/users/`);
  return { ok: "Request sent. You can sign in once an administrator approves it.", values: {} };
}

// approve / reject a pending request (admin or super admin)
export async function approveAccess(fd) { return decideAccess(fd, true); }
export async function rejectAccess(fd) { return decideAccess(fd, false); }
async function decideAccess(fd, approve) {
  const u = await staff("users");
  const id = Number(fd.get("id")), role = f(fd, "role");
  const x = db.prepare("SELECT * FROM users WHERE id = ? AND account_status = 'pending'").get(id);
  if (x) {
    if (approve) {
      const r = ROLES[role] && role !== "member" && (role !== "super_admin" || u.role === "super_admin") ? role : x.role;
      db.prepare("UPDATE users SET account_status = 'active', role = ?, email_verified = 1 WHERE id = ?").run(r, id);
      audit(u.id, "access.approve", "user", x.username, ROLES[r]);
    } else {
      db.prepare("UPDATE users SET account_status = 'rejected' WHERE id = ?").run(id);
      audit(u.id, "access.reject", "user", x.username);
    }
  }
  back("/admin/users/?saved=1");
}

// ---------- bookings ----------
const NOTIFY = {
  under_review: ["Your entry pass request is under review", "Our team is reviewing your request."],
  awaiting: ["Action needed for your entry pass request", "We need a little more from you to complete your request. Our team will contact you, or reply to this email."],
  confirmed: ["Your entry passes are confirmed", "Good news — your request is confirmed and your official entry passes with QR codes are ready."],
  rejected: ["Update on your entry pass request", "Unfortunately we are unable to confirm your request."],
  cancelled: ["Your entry pass request has been cancelled", "Your request has been cancelled. Any passes issued for it are no longer valid."],
};
async function notifyCustomer(b, status) {
  const n = NOTIFY[status];
  if (!n) return;
  const e = db.prepare("SELECT * FROM events WHERE id = ?").get(b.event_id);
  const confirmed = status === "confirmed";
  const passes = confirmed ? db.prepare("SELECT * FROM passes WHERE booking_id = ? AND status = 'valid' ORDER BY id").all(b.id) : [];
  const attachments = confirmed && passes.length ? [{ filename: `${b.ref}-entry-passes.pdf`, content: Buffer.from(await passesPdf(b, e, passes)), contentType: "application/pdf" }] : [];
  const greeting = confirmed ? `Hello ${b.name},\n\nYour entry passes for ${e.name} are confirmed. Your official PDF tickets with individual QR codes are attached to this email.` : `Hello ${b.name},\n\n${n[1]}`;
  await sendEmail(b.email, `${n[0]} – ${b.ref}`, `${greeting}\n\nEvent: ${e.name}, ${fmtDate(eventStart(e))}\nReference: ${b.ref}\nStatus: ${STATUS[status]}\n\nView: ${await siteUrl()}/entry-pass/${b.access_token}/\n${confirmed ? "\nPlease bring each pass to the event. Each QR code admits one person once.\n" : ""}\n${site.company.name}`, b.id, attachments);
}

export async function updateStatus(_, fd) {
  const u = await staff("bookings.update");
  const id = Number(fd.get("id")), to = f(fd, "status");
  if (to === "confirmed" && !can(u, "bookings.confirm")) return { error: "You don't have permission to confirm bookings." };
  try {
    const b = changeStatus(id, to, u, f(fd, "remarks"));
    if (to === "confirmed" || fd.get("notify")) await notifyCustomer(b, to);
  } catch (e) { if (e instanceof BookingError) return { error: e.message }; throw e; }
  back(`/admin/bookings/${id}/`);
}

// bulk: never "confirmed" — confirmations are one by one on purpose
export async function bulkStatus(fd) {
  const u = await staff("bookings.update");
  const ids = fd.getAll("ids").map(Number).filter(Boolean), to = f(fd, "status");
  if (!ids.length || !["under_review", "contacted", "awaiting", "cancelled", "expired"].includes(to) || f(fd, "confirm") !== "yes") back("/admin/bookings/?bulk=0");
  let ok = 0;
  for (const id of ids) { try { changeStatus(id, to, u, "Bulk update"); ok++; } catch {} }
  audit(u.id, "booking.bulk_status", "booking", ids.join(","), `${ok}/${ids.length} → ${to}`);
  back(`/admin/bookings/?bulk=${ok}`);
}

export async function savePayment(_, fd) {
  const u = await staff("payments");
  const id = Number(fd.get("id"));
  const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  const rate = Number(f(fd, "rate")) || 0, received = Number(f(fd, "received")) || 0, total = rate * b.quantity;
  const status = f(fd, "status") || (received <= 0 ? "unpaid" : received < total ? "partial" : "paid");
  db.prepare(`INSERT INTO payments (booking_id, rate, total, status, method, received, payment_date, reference, remarks, updated_by, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET rate=excluded.rate, total=excluded.total, status=excluded.status, method=excluded.method,
    received=excluded.received, payment_date=excluded.payment_date, reference=excluded.reference, remarks=excluded.remarks, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .run(id, rate, total, status, f(fd, "method"), received, f(fd, "payment_date"), f(fd, "reference"), f(fd, "remarks"), u.id, now());
  audit(u.id, "payment.update", "booking", b.ref, { status, rate, total, received, method: f(fd, "method") });
  back(`/admin/bookings/${id}/`);
}

export async function saveNotes(fd) {
  const u = await staff("bookings.update");
  const id = Number(fd.get("id"));
  db.prepare("UPDATE bookings SET notes = ?, updated_at = ? WHERE id = ?").run(f(fd, "notes"), now(), id);
  audit(u.id, "booking.notes", "booking", id);
  back(`/admin/bookings/${id}/`);
}

export async function editBooking(_, fd) {
  const u = await staff("bookings.update");
  const id = Number(fd.get("id"));
  const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  const v = { name: f(fd, "name"), mobile: cleanMobile(f(fd, "mobile")), email: f(fd, "email").toLowerCase(), nationality: f(fd, "nationality"), quantity: Number(f(fd, "quantity")) || b.quantity };
  if (!v.name || !validMobile(v.mobile) || !validEmail(v.email) || !v.nationality) return { error: "Please check the details." };
  const holders = readPassHolders(fd, v.quantity);
  if (!holders) return { error: "Please enter a first and last name for every pass." };
  if (v.quantity !== b.quantity) {
    if (["confirmed", "checked_in"].includes(b.status)) return { error: "Passes are already issued — cancel and create a new request to change the quantity." };
    if (ACTIVE.includes(b.status) && v.quantity - b.quantity > eventStats(b.event_id).available) return { error: "Not enough capacity for that quantity." };
  }
  db.transaction(() => {
    db.prepare("UPDATE bookings SET name=?, mobile=?, email=?, nationality=?, quantity=?, pass_holders_json=?, updated_at=? WHERE id=?").run(v.name, v.mobile, v.email, v.nationality, v.quantity, JSON.stringify(holders), now(), id);
    if (["confirmed", "checked_in"].includes(b.status)) {
      const passes = db.prepare("SELECT id FROM passes WHERE booking_id = ? ORDER BY id").all(id);
      passes.forEach((p, i) => db.prepare("UPDATE passes SET holder = ? WHERE id = ?").run(holderName(holders[i]), p.id));
    }
    db.prepare("UPDATE payments SET total = rate * ? WHERE booking_id = ?").run(v.quantity, id);
  }).immediate();
  audit(u.id, "booking.edit", "booking", b.ref, v);
  back(`/admin/bookings/${id}/`);
}

export async function revealCivil(id) {
  const u = await staff("civil.view");
  const b = db.prepare("SELECT ref, civil_enc FROM bookings WHERE id = ?").get(Number(id));
  audit(u.id, "civil.view", "booking", b.ref, "Civil ID revealed");
  return decrypt(b.civil_enc);
}

export async function resendConfirmation(fd) {
  await staff("bookings.update");
  const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(Number(fd.get("id")));
  await notifyCustomer(b, b.status === "checked_in" ? "confirmed" : b.status);
  back(`/admin/bookings/${b.id}/?sent=1`);
}

export async function retryNotification(fd) {
  await staff("bookings.update");
  const n = db.prepare("SELECT * FROM notifications WHERE id = ?").get(Number(fd.get("id")));
  if (n?.channel === "whatsapp") await sendWhatsApp(n.recipient, n.body, n.booking_id, n.id);
  if (n?.channel === "email") {
    const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(n.booking_id);
    if (b?.status === "confirmed" || b?.status === "checked_in") await notifyCustomer(b, "confirmed");
    else await sendEmail(n.recipient, n.subject, n.body, n.booking_id);
  }
  back(f(fd, "back") || "/admin/settings/");
}

export async function reissue(fd) {
  const u = await staff("bookings.confirm");
  try { reissuePass(Number(fd.get("pass")), u); } catch (e) { if (!(e instanceof BookingError)) throw e; }
  back(`/admin/bookings/${fd.get("id")}/`);
}

// ---------- check-in (called from the scanner) ----------
export async function verifyAction(raw) {
  await staff("checkin");
  const r = verifyPass(raw);
  return { result: r.result, wrongDay: r.wrongDay, pass: r.pass && { id: r.pass.id, serial: r.pass.serial, holder: r.pass.holder, event: r.pass.event_name, code: r.pass.event_code, date: r.pass.date, ref: r.pass.ref, at: r.pass.checked_in_at } };
}
export async function checkInAction(passId) {
  const u = await staff("checkin");
  const r = checkIn(Number(passId), u);
  audit(u.id, "pass.checkin", "pass", r.pass?.serial, r.result);
  return { result: r.result };
}

// ---------- events ----------
const slugify = (s) => s.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function saveEvent(_, fd) {
  const u = await staff("events");
  const id = Number(fd.get("id")) || 0;
  const v = {
    name: f(fd, "name"), category: f(fd, "category"), description: f(fd, "description"), date: f(fd, "date"), start_time: f(fd, "start_time"), end_time: f(fd, "end_time"),
    venue: f(fd, "venue"), area: f(fd, "area"), map_url: f(fd, "map_url"), poster: f(fd, "poster"), gallery: JSON.stringify(f(fd, "gallery").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)),
    lineup: JSON.stringify(f(fd, "lineup").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)), capacity: Math.max(0, Number(f(fd, "capacity")) || 0), reserved: Math.max(0, Number(f(fd, "reserved")) || 0),
    max_per_booking: Math.max(1, Number(f(fd, "max_per_booking")) || 1), max_per_person: Math.max(1, Number(f(fd, "max_per_person")) || 1),
    reg_open: f(fd, "reg_open"), reg_close: f(fd, "reg_close"), status: f(fd, "status") || "draft", members_only: fd.get("members_only") ? 1 : 0,
    is_hidden: fd.get("is_hidden") ? 1 : 0,
    internal_rate: Math.max(0, Number(f(fd, "internal_rate")) || 0), terms: f(fd, "terms") || DEFAULT_TERMS,
  };
  const values = { ...v, gallery: f(fd, "gallery"), lineup: f(fd, "lineup") };
  if (!v.name || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return { error: "Event name and date are required.", values };
  const file = fd.get("poster_file");
  if (file && file.size) { // poster upload → persistent data directory
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5e6) return { error: "Poster must be a JPG, PNG or WebP under 5 MB.", values };
    const dir = path.join(DATA_DIR, "uploads"); fs.mkdirSync(dir, { recursive: true });
    const name = token(9) + "." + file.type.split("/")[1].replace("jpeg", "jpg");
    fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    v.poster = "media/" + name;
  }
  const t = now();
  let eid = id;
  try { db.transaction(() => {
    if (id) {
      const used = eventStats(id).used;
      if (v.capacity && v.capacity - v.reserved < used) throw new BookingError(`Capacity can't go below the ${used} passes already requested.`);
      db.prepare(`UPDATE events SET name=?, category=?, description=?, date=?, start_time=?, end_time=?, venue=?, area=?, map_url=?, poster=?, gallery=?, lineup=?,
        capacity=?, reserved=?, max_per_booking=?, max_per_person=?, reg_open=?, reg_close=?, status=?, members_only=?, is_hidden=?, internal_rate=?, terms=?, updated_at=? WHERE id=?`)
        .run(v.name, v.category, v.description, v.date, v.start_time, v.end_time, v.venue, v.area, v.map_url, v.poster, v.gallery, v.lineup, v.capacity, v.reserved,
          v.max_per_booking, v.max_per_person, v.reg_open, v.reg_close, v.status, v.members_only, v.is_hidden, v.internal_rate, v.terms, t, id);
    } else {
      const code = nextCode(db, "event", "EVT", 3);
      let slug = slugify(v.name) || code.toLowerCase();
      if (db.prepare("SELECT 1 FROM events WHERE slug = ?").get(slug)) slug += "-" + code.toLowerCase();
      eid = db.prepare(`INSERT INTO events (event_code, slug, name, category, description, date, start_time, end_time, venue, area, map_url, poster, gallery, lineup,
        capacity, reserved, max_per_booking, max_per_person, reg_open, reg_close, status, members_only, is_hidden, internal_rate, terms, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(code, slug, v.name, v.category, v.description, v.date, v.start_time, v.end_time, v.venue, v.area,
        v.map_url, v.poster, v.gallery, v.lineup, v.capacity, v.reserved, v.max_per_booking, v.max_per_person, v.reg_open, v.reg_close, v.status, v.members_only, v.is_hidden, v.internal_rate, v.terms, t, t).lastInsertRowid;
    }
  }).immediate(); } catch (e) { if (e instanceof BookingError) return { error: e.message, values }; throw e; }
  audit(u.id, id ? "event.update" : "event.create", "event", eid, { name: v.name, status: v.status, hidden: !!v.is_hidden, capacity: v.capacity });
  back(`/admin/events/${eid}/?saved=1`);
}

export async function toggleEventVisibility(fd) {
  const u = await staff("events");
  const id = Number(fd.get("id"));
  const e = db.prepare("SELECT id, is_hidden FROM events WHERE id = ?").get(id);
  if (!e) throw new Error("Event not found");
  const hidden = e.is_hidden ? 0 : 1;
  db.prepare("UPDATE events SET is_hidden = ?, updated_at = ? WHERE id = ?").run(hidden, now(), id);
  audit(u.id, hidden ? "event.hide" : "event.show", "event", id);
  revalidatePath("/");
  revalidatePath("/events/");
  back("/admin/events/");
}

// ---------- users ----------
export async function saveUser(_, fd) {
  const u = await staff("users");
  const id = Number(fd.get("id")) || 0;
  const v = { name: f(fd, "name"), username: f(fd, "username").toLowerCase() || null, email: f(fd, "email").toLowerCase(), mobile: cleanMobile(f(fd, "mobile")), nationality: f(fd, "nationality"), role: f(fd, "role") || "member",
    category_id: Number(f(fd, "category_id")) || null, membership_status: f(fd, "membership_status") || "active", account_status: f(fd, "account_status") || "active" };
  if (!ROLES[v.role]) return { error: "Unknown role.", values: v };
  if (v.username && !validUsername(v.username)) return { error: "Username: 3–32 letters, numbers, dots, dashes or underscores.", values: v };
  if (v.role !== "member" && !v.username) return { error: "Staff accounts need a username to sign in.", values: v };
  const target = id ? db.prepare("SELECT * FROM users WHERE id = ?").get(id) : null;
  // only a super admin can create, change or promote to super admin
  if (u.role !== "super_admin" && (v.role === "super_admin" || target?.role === "super_admin")) return { error: "Only a Super Administrator can manage Super Administrator accounts.", values: v };
  if (!v.name || !validEmail(v.email) || !validMobile(v.mobile)) return { error: "Please enter a name, valid email and mobile.", values: v };
  if (id === u.id && (v.role !== u.role || v.account_status !== "active")) return { error: "You can't change your own role or disable your own account.", values: v };
  const pw = f(fd, "password");
  const dupe = db.prepare("SELECT id FROM users WHERE (email = ? OR (username IS NOT NULL AND username = ? COLLATE NOCASE)) AND id != ?").get(v.email, v.username, id);
  if (dupe) return { error: "Another account uses this email or username.", values: v };
  if (id) {
    if (pw && pw.length < 8) return { error: "Password must be at least 8 characters.", values: v };
    db.prepare("UPDATE users SET name=?, username=?, email=?, mobile=?, nationality=?, role=?, category_id=?, membership_status=?, account_status=? WHERE id=?")
      .run(v.name, v.username, v.email, v.mobile, v.nationality, v.role, v.category_id, v.membership_status, v.account_status, id);
    if (pw) { db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(pw), id); db.prepare("DELETE FROM sessions WHERE user_id = ? AND user_id != ?").run(id, u.id); }
    if (v.account_status !== "active") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  } else {
    if (pw.length < 8) return { error: "Set a password of at least 8 characters for the new account.", values: v };
    const mid = v.role === "member" ? nextCode(db, "membership", "SCA-M-", 6) : null;
    db.prepare(`INSERT INTO users (membership_id, username, name, email, mobile, nationality, password_hash, role, category_id, membership_status, account_status, email_verified, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)`).run(mid, v.username, v.name, v.email, v.mobile, v.nationality, hashPassword(pw), v.role, v.category_id, v.membership_status, v.account_status, now());
  }
  audit(u.id, id ? "user.update" : "user.create", "user", id || v.email, { role: v.role, account_status: v.account_status });
  back(v.role === "member" ? "/admin/members/?saved=1" : "/admin/users/?saved=1");
}

export async function saveCategory(fd) {
  const u = await staff("users");
  const id = Number(fd.get("id")) || 0, name = f(fd, "name"), benefits = f(fd, "benefits"), active = fd.get("active") ? 1 : 0;
  if (name) {
    if (id) db.prepare("UPDATE membership_categories SET name=?, benefits=?, active=? WHERE id=?").run(name, benefits, active, id);
    else db.prepare("INSERT OR IGNORE INTO membership_categories (name, benefits, active) VALUES (?,?,1)").run(name, benefits);
    audit(u.id, "category.save", "category", id || name);
  }
  back("/admin/members/?tab=categories");
}

export async function saveSettings(_, fd) {
  const u = await staff("settings");
  for (const k of ["admin_whatsapp", "wa_phone_id"]) setSetting(k, f(fd, k));
  if (f(fd, "wa_token")) setSetting("wa_token", f(fd, "wa_token"));
  if (fd.get("clear_token")) setSetting("wa_token", "");
  audit(u.id, "settings.update", "settings", "", { admin_whatsapp: f(fd, "admin_whatsapp") });
  return { ok: "Settings saved." };
}
