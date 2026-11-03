import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { db, DEFAULT_TERMS } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { EVENT_STATUS, eventStats } from "@/lib/bookings";
import { saveEvent } from "@/lib/admin-actions";
import site from "@/data/site";

export default async function EventEdit({ params, searchParams }) {
  await requirePerm("events");
  const id = (await params).id;
  const e = id === "new" ? null : db.prepare("SELECT * FROM events WHERE id = ?").get(Number(id));
  const d = e || { capacity: 500, reserved: 0, max_per_booking: 4, max_per_person: 4, status: "draft", terms: DEFAULT_TERMS, gallery: "[]", lineup: "[]", internal_rate: 0 };
  const s = e && eventStats(e.id);
  const list = (j) => JSON.parse(j || "[]").join("\n");
  const statuses = Object.entries(EVENT_STATUS).filter(([k]) => k !== "full"); // "Fully Booked" is automatic
  return (
    <>
      <Head title={e ? `${e.event_code} · ${e.name}` : "New event"} sub={e ? `${s.used} passes requested · ${s.confirmed} confirmed · ${s.available} available` : "The Event ID is generated automatically."}>
        <Link className="btn btn-ghost" href="/admin/events/">← Events</Link>{e && <Link className="btn btn-ghost" href={`/events/${e.slug}/`} target="_blank">View public page</Link>}
      </Head>
      {(await searchParams).saved && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Event saved.</div>}
      <section className="a-card">
        <ActionForm action={saveEvent} submit={e ? "Save event" : "Create event"} className="form a-form3" hidden={{ id: e?.id || "", poster: d.poster || "" }} fields={[
          { name: "name", label: "Event name", required: true, defaultValue: d.name, full: true },
          { name: "category", label: "Category", defaultValue: d.category, placeholder: "Live Concert" },
          { name: "status", label: "Event status", type: "select", noEmpty: true, options: statuses, defaultValue: d.status, hint: "“Fully Booked” is set automatically when capacity runs out." },
          { name: "members_only", type: "checkbox", label: "Members only (invitation event)", defaultValue: !!d.members_only },
          { name: "date", label: "Event date", type: "date", required: true, defaultValue: d.date },
          { name: "start_time", label: "Start time", type: "time", defaultValue: d.start_time },
          { name: "end_time", label: "End time", type: "time", defaultValue: d.end_time },
          { name: "venue", label: "Venue", defaultValue: d.venue },
          { name: "area", label: "Location / area", defaultValue: d.area, placeholder: "Shuwaikh, Kuwait" },
          { name: "map_url", label: "Google Maps link", type: "url", defaultValue: d.map_url },
          { name: "description", label: "Description", type: "textarea", defaultValue: d.description, full: true },
          { name: "capacity", label: "Total entry capacity", type: "number", min: 0, required: true, defaultValue: d.capacity },
          { name: "reserved", label: "Reserved capacity (held back)", type: "number", min: 0, defaultValue: d.reserved },
          { name: "max_per_booking", label: "Max passes per booking", type: "number", min: 1, defaultValue: d.max_per_booking },
          { name: "max_per_person", label: "Max passes per person", type: "number", min: 1, defaultValue: d.max_per_person },
          { name: "reg_open", label: "Registration opens", type: "datetime-local", defaultValue: d.reg_open, hint: "Kuwait time. Empty = open now." },
          { name: "reg_close", label: "Registration closes (cut-off)", type: "datetime-local", defaultValue: d.reg_close },
          { name: "internal_rate", label: "Internal entry pass rate (KD) — admin only", type: "number", min: 0, defaultValue: d.internal_rate, hint: "Never shown on the website." },
          { name: "gallery", label: "Gallery images (one per line)", type: "textarea", defaultValue: list(d.gallery), hint: "e.g. images/g-dilki-stage.jpg" },
          { name: "lineup", label: "Line-up artist IDs (one per line)", type: "textarea", defaultValue: list(d.lineup), hint: "From data/site.js: " + (site.artists || []).map((a) => a.slug).join(", ") },
          { name: "terms", label: "Event terms & conditions", type: "textarea", defaultValue: d.terms, full: true },
        ]}>
          <div className="field full"><label htmlFor="poster_file">Poster / banner {d.poster && <small className="muted">(current: {d.poster})</small>}</label>
            <input id="poster_file" className="input" type="file" name="poster_file" accept="image/jpeg,image/png,image/webp" /></div>
        </ActionForm>
      </section>
    </>
  );
}
