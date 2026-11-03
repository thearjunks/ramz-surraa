// Server-side PDFs: request acknowledgement (no QR, not valid for entry) and official passes (one page per pass, QR code).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";
import { STATUS, fmtDate, fmtTime, fmtDT } from "./bookings";
import site from "@/data/site";

const C = { night: rgb(0.03, 0.04, 0.03), card: rgb(0.09, 0.12, 0.09), line: rgb(0.2, 0.24, 0.2), text: rgb(0.95, 0.96, 0.94),
  muted: rgb(0.65, 0.69, 0.64), volt: rgb(0.91, 0.93, 0.23), green: rgb(0.18, 0.7, 0.35), orange: rgb(0.95, 0.54, 0.12) };
const W = 420, H = 760;
// Standard PDF fonts only cover Latin text; anything else (e.g. Tamil/Sinhala names) is replaced
const safe = (s) => String(s ?? "").replace(/[^\x20-\x7E -ÿ–—‘’“”•]/g, "?");

async function img(doc, rel) {
  try {
    const f = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
    const bytes = fs.readFileSync(f);
    return /\.png$/i.test(f) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch { return null; }
}

function wrap(text, font, size, max) {
  const out = []; let line = "";
  for (const w of safe(text).split(/\s+/)) {
    const t = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

async function page(doc, fonts, event, { title, badge, badgeColor }) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.night });
  const poster = event.poster && (await img(doc, event.poster));
  if (poster) { // banner: poster cropped into the top area
    const h = 230, scale = W / poster.width;
    p.drawImage(poster, { x: 0, y: H - poster.height * scale + (poster.height * scale - h) / 2, width: W, height: poster.height * scale, opacity: 0.55 });
    p.drawRectangle({ x: 0, y: 0, width: W, height: H - h, color: C.night });
  }
  const logo = await img(doc, "/images/surraa-logo.png");
  if (logo) p.drawImage(logo, { x: 24, y: H - 64, width: 86, height: (86 / logo.width) * logo.height });
  p.drawText(safe(site.company.name.toUpperCase()), { x: 24, y: H - 84, size: 8, font: fonts.b, color: C.volt });
  p.drawText(safe(title), { x: 24, y: H - 200, size: 11, font: fonts.b, color: C.text });
  wrap(event.name.toUpperCase(), fonts.b, 26, W - 48).forEach((l, i) => p.drawText(l, { x: 24, y: H - 268 - i * 30, size: 26, font: fonts.b, color: C.text }));
  const bw = fonts.b.widthOfTextAtSize(badge, 10) + 24;
  p.drawRectangle({ x: 24, y: H - 225, width: bw, height: 20, color: badgeColor });
  p.drawText(badge, { x: 36, y: H - 218, size: 10, font: fonts.b, color: C.night });
  return p;
}

function field(p, fonts, x, y, label, value, w = 180) {
  p.drawText(safe(label).toUpperCase(), { x, y, size: 7, font: fonts.b, color: C.muted });
  wrap(value, fonts.r, 11, w).slice(0, 3).forEach((l, i) => p.drawText(l, { x, y: y - 15 - i * 13, size: 11, font: fonts.r, color: C.text }));
}

async function newDoc() {
  const doc = await PDFDocument.create();
  doc.setTitle("SURRAA entry pass"); doc.setAuthor(site.company.name);
  return { doc, fonts: { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold) } };
}

export async function acknowledgementPdf(booking, event) {
  const { doc, fonts } = await newDoc();
  const p = await page(doc, fonts, event, { title: "ENTRY PASS REQUEST", badge: STATUS[booking.status].toUpperCase(), badgeColor: C.orange });
  let y = 380;
  field(p, fonts, 24, y, "Booking reference", booking.ref); field(p, fonts, 220, y, "Requested passes", String(booking.quantity));
  y -= 60; field(p, fonts, 24, y, "Event date", fmtDate(event.date + "T12:00:00+03:00")); field(p, fonts, 220, y, "Time", fmtTime(event.start_time));
  y -= 60; field(p, fonts, 24, y, "Venue", `${event.venue}, ${event.area}`, 360);
  y -= 60; field(p, fonts, 24, y, "Name", booking.name); field(p, fonts, 220, y, "Submitted", fmtDT(booking.created_at));
  p.drawRectangle({ x: 24, y: 40, width: W - 48, height: 92, color: C.card, borderColor: C.orange, borderWidth: 1 });
  p.drawText("NOT AN ENTRY PASS", { x: 38, y: 110, size: 12, font: fonts.b, color: C.orange });
  wrap("This acknowledgement confirms that your request was received. It does not authorise admission. Official entry passes with QR codes are issued only after confirmation by our team.", fonts.r, 9, W - 76)
    .forEach((l, i) => p.drawText(l, { x: 38, y: 94 - i * 12, size: 9, font: fonts.r, color: C.muted }));
  return doc.save();
}

export async function passesPdf(booking, event, passes) {
  const { doc, fonts } = await newDoc();
  for (const [i, ps] of passes.entries()) {
    const p = await page(doc, fonts, event, { title: `OFFICIAL ENTRY PASS · ${i + 1} OF ${passes.length}`, badge: ps.checked_in_at ? "CHECKED IN" : "CONFIRMED", badgeColor: C.green });
    const qr = await doc.embedPng(await QRCode.toBuffer(ps.token, { margin: 1, width: 400, errorCorrectionLevel: "M" }));
    p.drawRectangle({ x: W - 24 - 150, y: 168, width: 150, height: 150, color: rgb(1, 1, 1) });
    p.drawImage(qr, { x: W - 24 - 144, y: 174, width: 138, height: 138 });
    let y = 380;
    field(p, fonts, 24, y, "Pass holder", ps.holder); field(p, fonts, 220, y, "Event ID", event.event_code);
    y -= 56; field(p, fonts, 24, y, "Date", fmtDate(event.date + "T12:00:00+03:00"), 200);
    y -= 56; field(p, fonts, 24, y, "Start time", fmtTime(event.start_time), 200);
    y -= 56; field(p, fonts, 24, y, "Venue", `${event.venue}, ${event.area}`, 200);
    p.drawText("PASS SERIAL", { x: 24, y: 140, size: 7, font: fonts.b, color: C.muted });
    p.drawText(safe(ps.serial), { x: 24, y: 118, size: 18, font: fonts.b, color: C.volt });
    p.drawText(`Booking ${safe(booking.ref)} · Issued ${safe(fmtDT(ps.issued_at))}`, { x: 24, y: 100, size: 8, font: fonts.r, color: C.muted });
    wrap("Admits one person, once. " + (event.terms || ""), fonts.r, 7, W - 48).slice(0, 5)
      .forEach((l, j) => p.drawText(l, { x: 24, y: 70 - j * 10, size: 7, font: fonts.r, color: C.muted }));
  }
  return doc.save();
}
