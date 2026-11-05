// Email + WhatsApp notifications. Never throws: the booking is already saved before we get here,
// failures are logged in the notifications table and can be retried from the admin.
import { db, now, setting } from "./db";

const FROM = "SURRAA <info@surraa.com>";
const html = (text) => `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#182018;line-height:1.6"><div style="padding:20px 24px;background:#0b120d;color:#eef236;font-size:20px;font-weight:700">SURRAA Community Association</div><div style="padding:24px;border:1px solid #dce3dc;border-top:0">${String(text).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]).replace(/\n/g, "<br>")}</div></div>`;

function log(channel, recipient, subject, body, status, error = "", bookingId = null) {
  return db.prepare("INSERT INTO notifications (channel, recipient, subject, body, status, error, booking_id, at) VALUES (?,?,?,?,?,?,?,?)")
    .run(channel, recipient, subject, body, status, error, bookingId, now()).lastInsertRowid;
}

function graphConfigured() {
  return Boolean(process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET);
}

async function sendViaGraph(to, subject, text, attachments) {
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(process.env.GRAPH_TENANT_ID)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) throw new Error(`Microsoft token HTTP ${tokenResponse.status}: ${(await tokenResponse.text()).slice(0, 240)}`);
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error("Microsoft token response did not include an access token");

  const sender = process.env.GRAPH_SENDER || "info@surraa.com";
  const graphAttachments = attachments.map((attachment) => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: attachment.filename,
    contentType: attachment.contentType || "application/octet-stream",
    contentBytes: Buffer.isBuffer(attachment.content)
      ? attachment.content.toString("base64")
      : Buffer.from(attachment.content || "").toString("base64"),
  }));
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html(text) },
        toRecipients: [{ emailAddress: { address: to } }],
        replyTo: [{ emailAddress: { address: "info@surraa.com" } }],
        attachments: graphAttachments,
      },
      saveToSentItems: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Microsoft Graph HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
}

// Prefer descriptive SMTP names while retaining legacy aliases for existing deployments.
export async function sendEmail(to, subject, text, bookingId = null, attachments = []) {
  if (!graphConfigured() && !process.env.SMTP_HOST) {
    console.log(`\n[email not configured] to ${to}: ${subject}\n${text}\n`);
    return log("email", to, subject, text, "logged", "SMTP not configured", bookingId);
  }
  try {
    if (graphConfigured()) {
      await sendViaGraph(to, subject, text, attachments);
      return log("email", to, subject, text, "sent", "", bookingId);
    }
    const nodemailer = (await import("nodemailer")).default;
    const port = +(process.env.SMTP_PORT || 587);
    const encryption = (process.env.SMTP_ENCRYPTION || "").toLowerCase();
    const user = process.env.SMTP_USERNAME || process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: encryption === "ssl" || port === 465,
      requireTLS: encryption === "tls",
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: user ? { user, pass } : undefined,
    });
    await t.sendMail({ from: process.env.MAIL_FROM || FROM, replyTo: "info@surraa.com", to, subject, text, html: html(text), attachments });
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
