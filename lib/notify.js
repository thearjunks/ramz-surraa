// Email + WhatsApp notifications. Never throws: the booking is already saved before we get here,
// failures are logged in the notifications table and can be retried from the admin.
import { db, now, setting } from "./db";

function log(channel, recipient, subject, body, status, error = "", bookingId = null) {
  return db.prepare("INSERT INTO notifications (channel, recipient, subject, body, status, error, booking_id, at) VALUES (?,?,?,?,?,?,?,?)")
    .run(channel, recipient, subject, body, status, error, bookingId, now()).lastInsertRowid;
}

// SMTP from env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
export async function sendEmail(to, subject, text, bookingId = null) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[email not configured] to ${to}: ${subject}\n${text}\n`);
    return log("email", to, subject, text, "logged", "SMTP not configured", bookingId);
  }
  try {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: +(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return log("email", to, subject, text, "sent", "", bookingId);
  } catch (e) {
    return log("email", to, subject, text, "failed", String(e.message || e), bookingId);
  }
}

// WhatsApp Business Cloud API (Meta). Settings: wa_token, wa_phone_id. Admin number: admin_whatsapp.
// ponytail: plain text messages only work inside Meta's 24h window — for guaranteed delivery register a message template.
export async function sendWhatsApp(to, text, bookingId = null, retryOf = null) {
  const tok = setting("wa_token"), pid = setting("wa_phone_id");
  if (!tok || !pid) return log("whatsapp", to, "", text, "logged", "WhatsApp API not configured — use the click-to-send link", bookingId);
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${pid}/messages`, {
      method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: String(to).replace(/\D/g, ""), type: "text", text: { body: text } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
    if (retryOf) db.prepare("UPDATE notifications SET status = 'resent' WHERE id = ?").run(retryOf);
    return log("whatsapp", to, "", text, "sent", "", bookingId);
  } catch (e) {
    return log("whatsapp", to, "", text, "failed", String(e.message || e), bookingId);
  }
}

export const adminWhatsApp = () => setting("admin_whatsapp", "96566247474");
export const waLink = (to, text) => "https://wa.me/" + String(to).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
