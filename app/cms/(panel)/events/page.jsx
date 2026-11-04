import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, Meter, Empty } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { eventStats, eventState, eventEnd, EVENT_STATUS, fmtDate, eventStart, fmtTime } from "@/lib/bookings";

export const metadata = { title: "Events" };
const TONE = { open: "up", upcoming: "info", closed: "warn", full: "err", completed: "past", cancelled: "past", draft: "past" };
const FILTERS = [["upcoming", "Upcoming"], ["draft", "Drafts"], ["past", "Past"], ["all", "All"]];

export default async function Events({ searchParams }) {
  await requirePerm("events");
  const sp = await searchParams;
  const f = FILTERS.find((x) => x[0] === sp.show)?.[0] || "upcoming";
  const all = db.prepare("SELECT * FROM events ORDER BY date DESC").all();
  const past = (e) => eventEnd(e).getTime() < Date.now() || e.status === "completed";
  const pick = { upcoming: (e) => !past(e) && e.status !== "draft", draft: (e) => e.status === "draft", past, all: () => true }[f];
  const list = all.filter(pick).sort((a, b) => (f === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
  const n = Object.fromEntries(FILTERS.map(([k]) => [k, all.filter({ upcoming: (e) => !past(e) && e.status !== "draft", draft: (e) => e.status === "draft", past, all: () => true }[k]).length]));
  return (
    <>
      <Head title="Events" sub="Each event has its own capacity, requests and pass numbers.">
        <Link className="btn btn-primary" href="/cms/events/new/"><Icon name="plus" />New event</Link>
      </Head>
      <nav className="chips" aria-label="Show">{FILTERS.map(([k, t]) => <Link key={k} href={"/cms/events/?show=" + k} aria-current={f === k ? "page" : undefined}>{t} · {n[k]}</Link>)}</nav>
      {list.length ? (
        <div className="k-grid k-g2">
          {list.map((e) => {
            const s = eventStats(e.id), st = eventState(e, s);
            return (
              <article key={e.id} className="k-card ev-card">
                <div className="pic" style={{ backgroundImage: `url(/${(e.poster || "images/poster-en.jpg").replace(/^\//, "")})` }}>
                  <span className={"pill " + (TONE[st.key] || "")}>{EVENT_STATUS[st.key]}</span><span className="code">{e.event_code}</span>
                </div>
                <div className="body">
                  <h3 style={{ fontSize: 18 }}>{e.name}</h3>
                  <p className="muted small">{fmtDate(eventStart(e))}{e.start_time ? " · " + fmtTime(e.start_time) : ""} · {e.venue || "Venue not set"}</p>
                  <Meter capacity={e.capacity - e.reserved} confirmed={s.confirmed} pending={s.pending} available={s.available} />
                  <div className="nums">
                    <div><b>{s.requests}</b><small>Requests</small></div><div><b>{s.confirmed}</b><small>Confirmed</small></div>
                    <div><b>{s.available}</b><small>Available</small></div><div><b>{s.checkedIn}</b><small>Checked in</small></div>
                  </div>
                </div>
                <div className="foot">
                  <Link className="btn btn-sm btn-primary" href={`/cms/bookings/?event=${e.id}&tab=action`}><Icon name="inbox" />Requests</Link>
                  <Link className="btn btn-sm" href={`/cms/events/${e.id}/`}><Icon name="edit" />Edit</Link>
                  {e.status !== "draft" && <a className="btn btn-sm btn-ghost" href={`/events/${e.slug}/`} target="_blank" rel="noopener"><Icon name="ext" />Public page</a>}
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="k-card"><Empty title={f === "draft" ? "No drafts" : "No events here yet"}><Link className="linkish" href="/cms/events/new/">Create an event</Link></Empty></div>}
    </>
  );
}
