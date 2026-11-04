import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, Kpi, Todo, Meter, Bars, StatusTag, Empty, kd } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { eventStats, eventEnd, eventStart, sweepExpired, fmtDate, fmtTime, fmtDT, kwToday } from "@/lib/bookings";

export const metadata = { title: "Home" };

function greeting() {
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home({ searchParams }) {
  const u = await requirePerm(null);
  const sp = await searchParams;
  const first = u.name.split(" ")[0];
  if (!can(u, "dashboard")) return (
    <>
      <Head title={`${greeting()}, ${first}`} sub="Your account is set up for entry verification." />
      <Link className="todo tone-ok" href="/cms/checkin/"><span className="ic"><Icon name="scan" /></span><div><b>Door check-in</b><span>Scan entry passes at the gate</span></div><span className="go"><Icon name="right" /></span></Link>
    </>
  );
  sweepExpired();
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const open = one("SELECT COUNT(*) n FROM bookings WHERE status IN ('pending','under_review','contacted','awaiting')").n;
  const newOnes = one("SELECT COUNT(*) n FROM bookings WHERE status = 'pending'").n;
  const waiting = one("SELECT COUNT(*) n FROM bookings WHERE status = 'awaiting'").n;
  const access = can(u, "users") ? one("SELECT COUNT(*) n FROM users WHERE account_status = 'pending'").n : 0;
  const unpaid = can(u, "payments") ? one(`SELECT COUNT(*) n FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.status IN ('confirmed','checked_in') AND COALESCE(p.status,'unpaid') IN ('unpaid','partial') AND COALESCE(p.total,0) > 0`).n : 0;
  const failed = can(u, "settings") ? one("SELECT COUNT(*) n FROM notifications WHERE status = 'failed'").n : 0;
  const todos = [
    [newOnes, "new requests to review", "/cms/bookings/?tab=action", "inbox", "warn"],
    [open - newOnes, "requests in progress", "/cms/bookings/?tab=action", "clock", "info"],
    [waiting, "waiting for the customer", "/cms/bookings/?tab=action&status=awaiting", "user", "info"],
    [unpaid, "confirmed bookings not fully paid", "/cms/payments/?pay=open", "card", "warn"],
    [access, "staff access requests", "/cms/users/?tab=requests", "shield", "warn"],
    [failed, "notifications failed to send", "/cms/settings/?tab=log", "alert", "err"],
  ].filter((t) => t[0] > 0);

  const events = db.prepare("SELECT * FROM events WHERE status NOT IN ('draft','cancelled') ORDER BY date, start_time").all();
  const next = events.find((e) => eventEnd(e).getTime() >= Date.now());
  const ns = next && eventStats(next.id);
  const days = next ? Math.max(0, Math.round((new Date(next.date + "T00:00:00+03:00") - new Date(kwToday() + "T00:00:00+03:00")) / 864e5)) : 0;

  const tot = one(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN status IN ('confirmed','checked_in') THEN quantity END),0) passes FROM bookings`);
  const checked = one("SELECT COUNT(*) n FROM passes WHERE checked_in_at IS NOT NULL").n;
  const members = one("SELECT COUNT(*) n FROM users WHERE role = 'member'").n;
  const money = can(u, "payments") && one(`SELECT COALESCE(SUM(p.received),0) rec, COALESCE(SUM(p.total),0) tot FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.status IN ('confirmed','checked_in')`);

  const dayList = [...Array(14)].map((_, i) => new Date(Date.now() + 3 * 3600e3 - (13 - i) * 864e5).toISOString().slice(0, 10));
  const perDay = Object.fromEntries(db.prepare(`SELECT date(created_at, '+3 hours') d, COUNT(*) n FROM bookings WHERE created_at >= ? GROUP BY d`)
    .all(new Date(Date.now() - 15 * 864e5).toISOString()).map((r) => [r.d, r.n]));
  const recent = db.prepare(`SELECT b.id, b.ref, b.name, b.quantity, b.status, b.created_at, e.name event FROM bookings b JOIN events e ON e.id = b.event_id ORDER BY b.id DESC LIMIT 6`).all();

  return (
    <>
      <Head title={`${greeting()}, ${first}`} sub={fmtDate(new Date()) + " · here is what needs your attention."}>
        {can(u, "events") && <Link className="btn" href="/cms/events/new/"><Icon name="plus" />New event</Link>}
        <Link className="btn btn-primary" href="/cms/bookings/?tab=action"><Icon name="inbox" />Review requests</Link>
      </Head>

      {sp.denied && <div className="notice warn" style={{ marginBottom: 14 }}>You don't have access to that page.</div>}

      <h2 style={{ margin: "4px 0 12px" }}>To do</h2>
      {todos.length ? <div className="k-grid k-g3" style={{ marginBottom: 26 }}>{todos.map(([n, l, h, i, t]) => <Todo key={l} n={n} label={l} href={h} icon={i} tone={t} />)}</div>
        : <div className="allclear" style={{ marginBottom: 26 }}><Icon name="check" />All caught up — nothing is waiting for you right now.</div>}

      <div className="cols">
        <div className="k-stack">
          <section className="k-card">
            <div className="card-h"><h2><Icon name="cal" />Next event</h2>{next && <span className="days">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}</span>}</div>
            {next ? (
              <div className="spot">
                <img src={"/" + (next.poster || "images/poster-en.jpg").replace(/^\//, "")} alt="" />
                <div>
                  <h3 style={{ fontSize: 20 }}>{next.name}</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>{fmtDate(eventStart(next))}{next.start_time ? " · " + fmtTime(next.start_time) : ""}<br />{next.venue}{next.area ? ", " + next.area : ""}</p>
                  <Meter capacity={next.capacity - next.reserved} confirmed={ns.confirmed} pending={ns.pending} available={ns.available} checkedIn={ns.checkedIn} />
                  <div className="row" style={{ marginTop: 12 }}>
                    <Link className="btn btn-sm btn-primary" href={`/cms/bookings/?event=${next.id}&tab=action`}>Requests</Link>
                    <Link className="btn btn-sm" href={`/cms/bookings/?event=${next.id}&tab=all`}>All bookings</Link>
                    {can(u, "events") && <Link className="btn btn-sm" href={`/cms/events/${next.id}/`}><Icon name="edit" />Edit</Link>}
                    <Link className="btn btn-sm" href="/cms/checkin/"><Icon name="scan" />Check-in</Link>
                  </div>
                </div>
              </div>
            ) : <Empty title="No upcoming events">{can(u, "events") && <Link className="linkish" href="/cms/events/new/">Create an event</Link>}</Empty>}
          </section>

          <section className="k-card">
            <div className="card-h"><h2><Icon name="chart" />Requests in the last 14 days</h2><Link className="linkish small" href="/cms/reports/">All insights →</Link></div>
            <Bars label="Requests per day" data={dayList.map((d) => [d.slice(8) + "/" + d.slice(5, 7), perDay[d] || 0])} />
          </section>
        </div>

        <div className="k-stack">
          <div className="k-grid k-g2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Kpi label="Booking requests" value={tot.n} href="/cms/bookings/?tab=all" />
            <Kpi label="Passes issued" value={tot.passes} hint={`${checked} checked in`} />
            <Kpi label="Members" value={members} href={can(u, "users") ? "/cms/users/?tab=members" : undefined} />
            {money ? <Kpi label="Payments received" value={kd(money.rec)} hint={`of ${kd(money.tot)} due`} href="/cms/payments/" /> : <Kpi label="Open requests" value={open} />}
          </div>
          <section className="k-card">
            <div className="card-h"><h2><Icon name="inbox" />Latest requests</h2><Link className="linkish small" href="/cms/bookings/?tab=all">See all →</Link></div>
            {recent.length ? (
              <div>{recent.map((r) => (
                <Link key={r.id} href={`/cms/bookings/${r.id}/`} className="who" style={{ justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="who"><span className="avatar">{r.name.slice(0, 1).toUpperCase()}</span><span><b style={{ fontSize: 14 }}>{r.name}</b><small className="muted" style={{ display: "block" }}>{r.quantity} pass{r.quantity > 1 ? "es" : ""} · {r.event} · {fmtDT(r.created_at)}</small></span></span>
                  <StatusTag s={r.status} />
                </Link>))}</div>
            ) : <Empty title="No requests yet">They will appear here as soon as someone requests an entry pass.</Empty>}
          </section>
        </div>
      </div>
    </>
  );
}
