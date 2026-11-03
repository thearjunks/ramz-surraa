// PDF download: acknowledgement while pending, official passes once confirmed.
import { db } from "@/lib/db";
import { passesFor } from "@/lib/bookings";
import { acknowledgementPdf, passesPdf } from "@/lib/pdf";

export async function GET(request, { params }) {
  const b = db.prepare("SELECT * FROM bookings WHERE access_token = ?").get((await params).token);
  if (!b) return new Response("Not found", { status: 404 });
  const e = db.prepare("SELECT * FROM events WHERE id = ?").get(b.event_id);
  const passes = ["confirmed", "checked_in"].includes(b.status) ? passesFor(b.id).filter((p) => p.status === "valid") : [];
  const bytes = passes.length ? await passesPdf(b, e, passes) : await acknowledgementPdf(b, e);
  return new Response(bytes, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${new URL(request.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${b.ref}-${passes.length ? "entry-passes" : "acknowledgement"}.pdf"`,
    "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex",
  } });
}
