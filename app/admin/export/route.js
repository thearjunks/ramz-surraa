// GET /admin/export/?report=…&format=xlsx|csv|pdf&<same filters as the bookings table>
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { currentUser, can, isStaff } from "@/lib/auth";
import { audit } from "@/lib/db";
import { buildReport } from "@/lib/reports";
import { FILTER_KEYS } from "@/lib/admin-query";
import { fmtDT } from "@/lib/bookings";

const safe = (s) => String(s ?? "").replace(/[^\x20-\x7E -ÿ–—]/g, "?");

export async function GET(req) {
  const u = await currentUser();
  if (!isStaff(u) || !can(u, "reports")) return new Response("Forbidden", { status: 403 });
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { title, columns, rows } = buildReport(u, params);
  const filters = FILTER_KEYS.concat("period").filter((k) => params[k]).map((k) => `${k}=${params[k]}`).join(", ") || "none";
  const meta = [`SURRAA Community Association — ${title}`, `Generated ${fmtDT(new Date())} (Kuwait) by ${u.name}`, `Filters: ${filters}`];
  const fmt = params.format || "xlsx";
  const name = `surraa-${params.report || "bookings"}-${new Date().toISOString().slice(0, 10)}`;
  audit(u.id, "export", "report", params.report || "bookings", `${fmt} · ${rows.length} rows · ${filters}`);
  const head = (type, ext) => ({ "Content-Type": type, "Content-Disposition": `attachment; filename="${name}.${ext}"`, "Cache-Control": "private, no-store" });

  if (fmt === "csv") {
    const esc = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s; }; // also blocks formula injection
    const csv = "﻿" + [...meta.map((m) => esc(m)), "", columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
    return new Response(csv, { headers: head("text/csv; charset=utf-8", "csv") });
  }

  if (fmt === "pdf") {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 842, H = 595, M = 28, size = 7; // A4 landscape
    const cols = columns.length, colW = (W - 2 * M) / Math.max(1, cols);
    const cut = (t) => { let s = safe(t); while (s && font.widthOfTextAtSize(s, size) > colW - 4) s = s.slice(0, -1); return s; };
    let p, y;
    const newPage = () => {
      p = doc.addPage([W, H]); y = H - M;
      meta.forEach((m, i) => { p.drawText(safe(m), { x: M, y: y - i * 12, size: i ? 8 : 11, font: i ? font : bold }); });
      y -= 46;
      columns.forEach((c, i) => p.drawText(cut(c), { x: M + i * colW, y, size, font: bold }));
      y -= 4; p.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) }); y -= 10;
    };
    newPage();
    for (const r of rows) {
      if (y < M + 10) newPage();
      r.forEach((v, i) => p.drawText(cut(v), { x: M + i * colW, y, size, font }));
      y -= 11;
    }
    if (!rows.length) p.drawText("No rows match these filters.", { x: M, y, size: 9, font });
    return new Response(await doc.save(), { headers: head("application/pdf", "pdf") });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "SURRAA Community Association";
  const ws = wb.addWorksheet(title.slice(0, 31).replace(/[\\/?*[\]:]/g, ""));
  meta.forEach((m, i) => { ws.addRow([m]).font = { bold: i === 0, size: i === 0 ? 13 : 10 }; });
  ws.addRow([]);
  const hr = ws.addRow(columns);
  hr.font = { bold: true, color: { argb: "FF0A0D0A" } };
  hr.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC9D93F" } }; });
  rows.forEach((r) => ws.addRow(r));
  ws.views = [{ state: "frozen", ySplit: meta.length + 2 }];
  ws.autoFilter = { from: { row: meta.length + 2, column: 1 }, to: { row: meta.length + 2, column: Math.max(1, columns.length) } };
  columns.forEach((c, i) => { ws.getColumn(i + 1).width = Math.min(40, Math.max(10, c.length + 2, ...rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2))); });
  return new Response(await wb.xlsx.writeBuffer(), { headers: head("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx") });
}
