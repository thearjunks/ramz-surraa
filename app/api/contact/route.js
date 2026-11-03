import { NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { sendEmail } from "@/lib/notify";
import { siteContent } from "@/lib/cms-site";

export async function POST(request) {
  if (!rateLimit("contact:" + (await clientIp()), 5, 60 * 60 * 1000))
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  let data;
  try { data = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const name = String(data.name || "").trim().slice(0, 120);
  const phone = String(data.phone || "").trim().slice(0, 40);
  const message = String(data.message || "").trim().slice(0, 5000);
  const subject = String(data.subject || data.title || "Website message").trim().slice(0, 160);
  if (data.website || data.consent !== "on" || !name || !/^[+\d][\d\s-]{6,}$/.test(phone) || !message)
    return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
  db.prepare("INSERT INTO contact_messages (name, phone, message, subject, created_at) VALUES (?,?,?,?,?)")
    .run(name, phone, message, subject, now());
  const recipient = siteContent().company.email;
  if (recipient) await sendEmail(recipient, `SURRAA contact: ${subject}`, `Name: ${name}\nPhone: ${phone}\n\n${message}`);
  return NextResponse.json({ ok: true });
}
