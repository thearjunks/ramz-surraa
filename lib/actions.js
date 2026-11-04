"use server";
// Public server actions. Next.js checks the Origin header on every server action (CSRF protection);
// all SQL uses bound parameters (no injection); React escapes all output (XSS).
import { redirect } from "next/navigation";
import { db, now, nextCode, audit } from "./db";
import { startSession, endSession, currentUser, clientIp, siteUrl } from "./auth";
import { hashPassword, verifyPassword, token, sha256, rateLimit, validCivil, validEmail, validMobile, cleanMobile, encrypt, decrypt, civilHash } from "./security";
import { createBooking, BookingError, fmtDate, fmtDT, STATUS } from "./bookings";
import { readPassHolders } from "./pass-holders";
import { sendEmail, sendWhatsApp, adminWhatsApp } from "./notify";
import site from "@/data/site";

const ORG = site.company.name;
const f = (fd, k) => String(fd.get(k) ?? "").trim();
const fail = (error, values) => ({ error, values });

// ---------- accounts ----------
export async function register(_, fd) {
  const v = { name: f(fd, "name"), mobile: cleanMobile(f(fd, "mobile")), email: f(fd, "email").toLowerCase(), nationality: f(fd, "nationality") };
  const pw = f(fd, "password");
  if (f(fd, "website")) return fail("Please try again.", v); // honeypot
  if (!rateLimit("reg:" + (await clientIp()), 5, 3600e3)) return fail("Too many attempts. Please try again later.", v);
  if (!v.name || !v.nationality) return fail("Please fill in all required fields.", v);
  if (!validMobile(v.mobile)) return fail("Please enter a valid mobile number.", v);
  if (!validEmail(v.email)) return fail("Please enter a valid email address.", v);
  if (pw.length < 8) return fail("Password must be at least 8 characters.", v);
  if (pw !== f(fd, "password2")) return fail("Passwords do not match.", v);
  if (!fd.get("consent")) return fail("Please accept the terms and privacy policy.", v);
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(v.email)) return fail("An account with this email already exists. Please sign in.", v);
  const id = db.transaction(() => {
    const mid = nextCode(db, "membership", "SCA-M-", 6);
    const cat = db.prepare("SELECT id FROM membership_categories WHERE active = 1 ORDER BY id LIMIT 1").get();
    return db.prepare(`INSERT INTO users (membership_id, name, mobile, email, nationality, password_hash, role, category_id, created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(mid, v.name, v.mobile, v.email, v.nationality, hashPassword(pw), "member", cat?.id ?? null, now()).lastInsertRowid;
  }).immediate();
  await sendVerification(id);
  audit(id, "user.register", "user", id);
  await startSession(id);
  redirect(safeNext(f(fd, "next")) || "/account/?welcome=1");
}

async function sendVerification(userId) {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const t = token();
  db.prepare("INSERT INTO user_tokens (token_hash, user_id, kind, expires_at) VALUES (?,?,?,?)").run(sha256(t), u.id, "verify", new Date(Date.now() + 3 * 864e5).toISOString());
  await sendEmail(u.email, `Welcome to ${ORG} – verify your email`,
    `Hello ${u.name},\n\nYour membership ID is ${u.membership_id}.\nPlease verify your email address:\n${await siteUrl()}/verify-email/?t=${t}\n\n${ORG}`);
}
export async function resendVerification() {
  const u = await currentUser();
  if (u && !u.email_verified && rateLimit("ver:" + u.id, 3, 3600e3)) await sendVerification(u.id);
  redirect("/account/?sent=1");
}

const safeNext = (n) => (/^\/(?!\/)/.test(n) ? n : "");

export async function signIn(_, fd) {
  const email = (f(fd, "email") || f(fd, "username")).toLowerCase(), pw = f(fd, "password"); // email or username
  const keep = { email, username: email };
  if (!rateLimit("login:" + (await clientIp()), 10, 15 * 60e3) || !rateLimit("login:" + email, 8, 15 * 60e3)) return fail("Too many sign-in attempts. Please wait 15 minutes.", keep);
  const u = db.prepare("SELECT * FROM users WHERE email = ? OR username = ? COLLATE NOCASE").get(email, email);
  if (!u || !verifyPassword(pw, u.password_hash)) return fail("Incorrect username or password.", keep);
  if (u.account_status === "pending") return fail("Your access request is waiting for administrator approval.", keep);
  if (u.account_status !== "active") return fail("This account is not active. Please contact the administrator.", keep);
  await startSession(u.id);
  audit(u.id, "user.signin", "user", u.id);
  redirect(safeNext(f(fd, "next")) || (u.role === "member" ? "/account/" : "/cms/"));
}

export async function signOut() {
  await endSession();
  redirect("/");
}

export async function signOutCms() {
  await endSession();
  redirect("/cms/login/");
}

export async function forgotPassword(_, fd) {
  const email = f(fd, "email").toLowerCase();
  if (rateLimit("forgot:" + (await clientIp()), 5, 3600e3)) {
    const u = db.prepare("SELECT * FROM users WHERE email = ? AND account_status = 'active'").get(email);
    if (u) {
      const t = token();
      db.prepare("INSERT INTO user_tokens (token_hash, user_id, kind, expires_at) VALUES (?,?,?,?)").run(sha256(t), u.id, "reset", new Date(Date.now() + 3600e3).toISOString());
      await sendEmail(u.email, `${ORG} – reset your password`, `Hello ${u.name},\n\nReset your password (link valid for 1 hour):\n${await siteUrl()}/reset-password/?t=${t}\n\nIf you didn't ask for this, ignore this email.`);
    }
  }
  return { ok: "If an account exists for this email, a reset link has been sent." }; // same answer either way
}

export async function resetPassword(_, fd) {
  const t = f(fd, "t"), pw = f(fd, "password");
  if (pw.length < 8) return fail("Password must be at least 8 characters.");
  if (pw !== f(fd, "password2")) return fail("Passwords do not match.");
  const row = db.prepare("SELECT * FROM user_tokens WHERE token_hash = ? AND kind = 'reset' AND used = 0 AND expires_at > ?").get(sha256(t), now());
  if (!row) return fail("This reset link is invalid or has expired. Please request a new one.");
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(pw), row.user_id);
    db.prepare("UPDATE user_tokens SET used = 1 WHERE token_hash = ?").run(row.token_hash);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.user_id); // sign out everywhere
  })();
  audit(row.user_id, "user.password_reset", "user", row.user_id);
  redirect("/sign-in/?reset=1");
}

export async function updateProfile(_, fd) {
  const u = await currentUser();
  if (!u) redirect("/sign-in/");
  const v = { name: f(fd, "name"), mobile: cleanMobile(f(fd, "mobile")), nationality: f(fd, "nationality") };
  const civil = f(fd, "civil").replace(/\s/g, "");
  if (!v.name || !v.nationality || !validMobile(v.mobile)) return fail("Please check your name, mobile number and nationality.");
  if (civil && !validCivil(civil)) return fail("Civil ID must be 12 digits.");
  db.prepare("UPDATE users SET name = ?, mobile = ?, nationality = ? WHERE id = ?").run(v.name, v.mobile, v.nationality, u.id);
  if (civil) db.prepare("UPDATE users SET civil_enc = ?, civil_hash = ?, civil_last4 = ? WHERE id = ?").run(encrypt(civil), civilHash(civil), civil.slice(-4), u.id);
  const pw = f(fd, "password");
  if (pw) {
    if (!verifyPassword(f(fd, "current"), u.password_hash)) return fail("Current password is incorrect.");
    if (pw.length < 8) return fail("New password must be at least 8 characters.");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(pw), u.id);
  }
  audit(u.id, "user.profile_update", "user", u.id);
  return { ok: "Your profile has been updated." };
}

// ---------- entry pass requests ----------
export async function requestEntryPass(_, fd) {
  const user = await currentUser();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(Number(fd.get("event_id")));
  const v = { name: f(fd, "name"), mobile: cleanMobile(f(fd, "mobile")), email: f(fd, "email").toLowerCase(), nationality: f(fd, "nationality"),
    civil: f(fd, "civil").replace(/\s/g, ""), quantity: Number(f(fd, "quantity")) || 1,
    governorate: f(fd, "governorate") };
  const holderValues = Object.fromEntries(Array.from({ length: Math.min(100, Math.max(0, v.quantity)) }, (_, i) => i + 1)
    .flatMap((i) => [[`holder_first_${i}`, f(fd, `holder_first_${i}`)], [`holder_last_${i}`, f(fd, `holder_last_${i}`)]]));
  const keep = { ...v, ...holderValues, civil: "" }; // never echo the Civil ID back
  if (!event) return fail("Event not found.", keep);
  if (f(fd, "website")) return fail("Please try again.", keep);
  if (!rateLimit("book:" + (await clientIp()), 6, 10 * 60e3)) return fail("Too many requests. Please wait a few minutes and try again.", keep);
  const useSaved = user && user.civil_enc && !v.civil;
  if (!v.name || !v.nationality) return fail("Please fill in all required fields.", keep);
  if (!validMobile(v.mobile)) return fail("Please enter a valid mobile number.", keep);
  if (!validEmail(v.email)) return fail("Please enter a valid email address.", keep);
  const holders = readPassHolders(fd, v.quantity);
  if (!holders) return fail("Please enter a first and last name for every pass.", keep);
  const governorates = new Set(["Al Asimah", "Al Farwaniya", "Hawalli", "Al Ahmadi", "Al Jahra", "Mubarak Al Kabeer"]);
  if (!governorates.has(v.governorate)) return fail("Please choose your Kuwait governorate.", keep);
  if (!useSaved && !validCivil(v.civil)) return fail("Please enter your 12-digit Civil ID number.", keep);
  if (!fd.get("terms")) return fail("Please accept the event terms and conditions.", keep);
  const civil = useSaved ? decrypt(user.civil_enc) : v.civil;

  let b;
  try {
    b = createBooking({ event, user, ...v, civil, holders, address: { governorate: v.governorate }, pageUrl: f(fd, "page_url").slice(0, 300) });
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message, keep);
    throw e;
  }
  if (user && fd.get("save_civil") && !user.civil_enc)
    db.prepare("UPDATE users SET civil_enc = ?, civil_hash = ?, civil_last4 = ? WHERE id = ?").run(encrypt(civil), civilHash(civil), civil.slice(-4), user.id);

  // notifications — booking is already saved, failures are only logged
  const url = await siteUrl();
  await sendWhatsApp(adminWhatsApp(), [`*${ORG.toUpperCase()} – NEW ENTRY PASS REQUEST*`, `Reference: ${b.ref}`, `Event: ${event.name}`,
    `Name: ${b.name}`, `Mobile: ${b.mobile}`, `Passes: ${b.quantity}`, `Status: ${STATUS[b.status]}`, `Submitted: ${fmtDT(b.created_at)} (Kuwait)`,
    `Dashboard: ${url}/cms/bookings/${b.id}/`].join("\n"), b.id);
  await sendEmail(b.email, `Entry pass request received – ${b.ref}`,
    `Hello ${b.name},\n\nThank you for requesting your entry pass for ${event.name} (${fmtDate(event.date + "T12:00:00+03:00")}).\n` +
    `Reference: ${b.ref}\nPasses requested: ${b.quantity}\nStatus: Pending Confirmation\n\nThis is NOT an entry pass. Our team will contact you shortly.\n` +
    `Track your request: ${url}/entry-pass/${b.access_token}/\n\n${ORG}`, b.id);
  redirect(`/entry-pass/${b.access_token}/?new=1`);
}

export async function trackEntryPass(_, fd) {
  const ref = f(fd, "ref").toUpperCase(), contact = f(fd, "contact").toLowerCase();
  if (!rateLimit("track:" + (await clientIp()), 15, 15 * 60e3)) return fail("Too many attempts. Please wait 15 minutes.", { ref, contact });
  const b = db.prepare("SELECT * FROM bookings WHERE ref = ?").get(ref);
  const digits = (s) => s.replace(/\D/g, "").slice(-8); // Kuwait numbers: compare the last 8 digits
  const ok = b && (b.email.toLowerCase() === contact || (digits(contact).length === 8 && digits(b.mobile) === digits(contact)));
  if (!ok) return fail("We couldn't find a request with this reference and email / mobile number.", { ref, contact });
  redirect(`/entry-pass/${b.access_token}/`);
}
