import Link from "next/link";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { Head, Meter } from "@/components/cms/ui";
import { db, DEFAULT_TERMS } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { eventStats } from "@/lib/bookings";
import { saveEvent } from "@/lib/admin-actions";
import site from "@/data/site";

export const metadata = { title: "Edit event" };
const STATUSES = [["draft", "Draft — hidden from the website"], ["upcoming", "Coming soon — shown, requests not open yet"], ["open", "Open — accepting entry pass requests"],
  ["closed", "Closed — shown, no new requests"], ["completed", "Completed"], ["cancelled", "Cancelled"]];

export default async function EventEdit({ params, searchParams }) {
  await requirePerm("events");
  const id = (await params).id;
  const e = id === "new" ? null : db.prepare("SELECT * FROM events WHERE id = ?").get(Number(id));
  const d = e || { capacity: 500, reserved: 0, max_per_booking: 4, max_per_person: 4, status: "draft", terms: DEFAULT_TERMS, gallery: "[]", lineup: "[]", internal_rate: 0 };
  const s = e && eventStats(e.id);
  const list = (j) => JSON.parse(j || "[]").join("\n");
  const sp = await searchParams;
  return (
    <>
      <Head title={e ? e.name : "New event"} back={["/cms/events/", "Events"]} sub={e ? `${e.event_code} · ${s.requests} requests · ${s.confirmed} passes confirmed` : "Fill in the steps below. The event ID is created automatically."}>
        {e && <Link className="btn" href={`/cms/bookings/?event=${e.id}&tab=all`}><Icon name="inbox" />Bookings</Link>}
        {e && e.status !== "draft" && <a className="btn" href={`/events/${e.slug}/`} target="_blank" rel="noopener"><Icon name="ext" />Public page</a>}
      </Head>
      {sp.saved && <div className="notice ok" style={{ marginBottom: 14 }}>Event saved. Changes are live on the website.</div>}
      {e && <section className="k-card" style={{ marginBottom: 16 }}><h2>Capacity right now</h2><Meter capacity={e.capacity - e.reserved} confirmed={s.confirmed} pending={s.pending} reserved={e.reserved} available={s.available} checkedIn={s.checkedIn} /></section>}
      <section className="k-card">
        <ActionForm action={saveEvent} submit={e ? "Save event" : "Create event"} hidden={{ id: e?.id || "", poster: d.poster || "" }} fields={[
          { type: "section", num: 1, label: "Basics", hint: "What the event is called and whether people can see it." },
          { name: "name", label: "Event name", required: true, defaultValue: d.name, full: true, placeholder: "e.g. SUNDOWN – Chapter 2" },
          { name: "status", label: "Status", type: "select", noEmpty: true, options: STATUSES, defaultValue: d.status, hint: "“Fully booked” is shown automatically when seats run out." },
          { name: "category", label: "Category", defaultValue: d.category, placeholder: "Live Concert" },
          { name: "description", label: "Short description (shown on the website)", type: "textarea", defaultValue: d.description, full: true },
          { name: "members_only", type: "checkbox", label: "Members only — guests must sign in to request passes", defaultValue: !!d.members_only },

          { type: "section", num: 2, label: "Date & venue" },
          { name: "date", label: "Event date", type: "date", required: true, defaultValue: d.date },
          { name: "start_time", label: "Start / gates open", type: "time", defaultValue: d.start_time },
          { name: "end_time", label: "End time", type: "time", defaultValue: d.end_time },
          { name: "venue", label: "Venue", defaultValue: d.venue, placeholder: "The Convention Centre & Royal Suites Hotel" },
          { name: "area", label: "Area", defaultValue: d.area, placeholder: "Shuwaikh, Kuwait" },
          { name: "map_url", label: "Google Maps link", type: "url", defaultValue: d.map_url },

          { type: "section", num: 3, label: "Seats & limits", hint: "How many people can attend and how many passes one person can request." },
          { name: "capacity", label: "Total capacity", type: "number", min: 0, required: true, defaultValue: d.capacity },
          { name: "reserved", label: "Seats held back (guests, VIPs)", type: "number", min: 0, defaultValue: d.reserved, hint: "Not available for online requests." },
          { name: "max_per_booking", label: "Max passes per request", type: "number", min: 1, defaultValue: d.max_per_booking },
          { name: "max_per_person", label: "Max passes per person (all requests)", type: "number", min: 1, defaultValue: d.max_per_person },

          { type: "section", num: 4, label: "Request window", hint: "Kuwait time. Leave empty to open now and close when the event starts." },
          { name: "reg_open", label: "Requests open", type: "datetime-local", defaultValue: d.reg_open },
          { name: "reg_close", label: "Requests close", type: "datetime-local", defaultValue: d.reg_close },

          { type: "section", num: 5, label: "Website content" },
          { name: "lineup", label: "Line-up (one artist ID per line)", type: "textarea", defaultValue: list(d.lineup), hint: "Available: " + (site.artists || []).map((a) => a.slug).join(", ") },
          { name: "gallery", label: "Gallery images (one per line)", type: "textarea", defaultValue: list(d.gallery), hint: "e.g. images/g-dilki-stage.jpg" },
          { name: "terms", label: "Terms & conditions", type: "textarea", defaultValue: d.terms, full: true },

          { type: "section", num: 6, label: "Internal (staff only)", hint: "Never shown on the website." },
          { name: "internal_rate", label: "Rate per pass (KD)", type: "number", min: 0, defaultValue: d.internal_rate, hint: "Used to work out what each booking owes. 0 = free." },
        ]}>
          <div className="field full"><label htmlFor="poster_file">Poster image {d.poster && <small className="muted">— current: {d.poster}</small>}</label>
            <input id="poster_file" type="file" name="poster_file" accept="image/jpeg,image/png,image/webp" /><p className="hint">JPG, PNG or WebP, up to 5 MB. Leave empty to keep the current poster.</p></div>
        </ActionForm>
      </section>
    </>
  );
}
