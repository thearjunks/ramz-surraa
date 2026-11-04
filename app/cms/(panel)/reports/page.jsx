import Icon from "@/components/Icon";
import { Head, Bars, HBars, kd } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { REPORTS } from "@/lib/reports";
import { eventStats, eventEnd } from "@/lib/bookings";

export const metadata = { title: "Reports & exports" };
const ABOUT = {
  bookings: ["inbox", "Every booking request with customer, status and dates."],
  event: ["cal", "All requests for one event — pick the event above."],
  pending: ["clock", "Requests still waiting for confirmation."],
  confirmed: ["ticket", "Guest list: confirmed passes with serial numbers."],
  cancelled: ["close", "Rejected, cancelled and expired requests."],
  members: ["users", "Registered members and their membership details."],
  guests: ["user", "Guests who requested passes without an account."],
  capacity: ["chart", "Capacity, requests and availability for each event."],
  payments: ["card", "Amounts due, received and outstanding."],
  attendance: ["scan", "Who checked in at the door, and when."],
  period: ["activity", "Request totals per day, week or month (choose below)."],
};

export default async function Reports() {
  const u = await requirePerm("reports");
  const events = db.prepare("SELECT * FROM events ORDER BY date DESC").all();
  const list = Object.entries(REPORTS).filter(([k]) => k !== "payments" || can(u, "reports.finance") || can(u, "payments"));
  const upcoming = events.filter((e) => e.status !== "draft" && eventEnd(e).getTime() >= Date.now());
  const stats = upcoming.map((e) => [e, eventStats(e.id)]);
  const byEvent = db.prepare(`SELECT e.name, COUNT(b.id) n FROM events e LEFT JOIN bookings b ON b.event_id = e.id WHERE e.status != 'draft' GROUP BY e.id ORDER BY e.date DESC LIMIT 8`).all();
  const growth = db.prepare("SELECT strftime('%Y-%m', created_at) m, COUNT(*) n FROM users WHERE role = 'member' GROUP BY m ORDER BY m DESC LIMIT 12").all().reverse();
  const att = db.prepare(`SELECT e.name, COUNT(p.id) issued, SUM(p.checked_in_at IS NOT NULL) inn FROM events e JOIN passes p ON p.event_id = e.id AND p.status = 'valid' GROUP BY e.id ORDER BY e.date DESC LIMIT 6`).all();
  const pay = (can(u, "payments") || can(u, "reports.finance")) && db.prepare(`SELECT p.status, COUNT(*) n, SUM(p.total) total, SUM(p.received) received FROM payments p JOIN bookings b ON b.id = p.booking_id
    WHERE b.status NOT IN ('rejected','cancelled','expired') AND p.total > 0 GROUP BY p.status`).all();
  return (
    <>
      <Head title="Reports & exports" sub="Quick insights, and downloads for Excel, CSV or PDF. Every download is recorded in the activity log." />

      <h2 style={{ margin: "0 0 12px" }}>Insights</h2>
      <div className="k-grid k-g2" style={{ marginBottom: 28 }}>
        <section className="k-card"><h2 style={{ marginBottom: 6 }}>Seats used — upcoming events</h2><HBars rows={stats.map(([e, s]) => [e.name, s.used, e.capacity - e.reserved, `${s.confirmed} confirmed · ${s.pending} pending · ${s.available} available`])} /></section>
        <section className="k-card"><h2 style={{ marginBottom: 6 }}>Requests per event</h2><HBars rows={byEvent.map((r) => [r.name, r.n, Math.max(1, ...byEvent.map((x) => x.n))])} /></section>
        <section className="k-card"><h2>New members per month</h2>{growth.length ? <Bars label="New members per month" data={growth.map((r) => [r.m.slice(5) + "/" + r.m.slice(2, 4), r.n])} /> : <p className="muted small" style={{ marginTop: 8 }}>No members yet.</p>}</section>
        <section className="k-card"><h2 style={{ marginBottom: 6 }}>Attendance</h2><HBars rows={att.map((r) => [r.name, r.inn || 0, r.issued, "checked in of passes issued"])} /></section>
        {pay && <section className="k-card"><h2 style={{ marginBottom: 6 }}>Payments</h2><HBars rows={pay.map((r) => [r.status, r.n, pay.reduce((s, x) => s + x.n, 0), `${kd(r.received)} received of ${kd(r.total)}`])} /></section>}
      </div>

      <h2 style={{ margin: "0 0 12px" }}>Download a report</h2>
      <form action="/cms/export/" method="get">
        <section className="k-card" style={{ marginBottom: 14 }}>
          <div className="mf" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
            <label className="small" style={{ display: "flex", flexDirection: "column", gap: 5, fontWeight: 700 }}>Event<select name="event"><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
            <label className="small" style={{ display: "flex", flexDirection: "column", gap: 5, fontWeight: 700 }}>Requests from<input type="date" name="from" /></label>
            <label className="small" style={{ display: "flex", flexDirection: "column", gap: 5, fontWeight: 700 }}>Requests to<input type="date" name="to" /></label>
            <label className="small" style={{ display: "flex", flexDirection: "column", gap: 5, fontWeight: 700 }}>Group totals by<select name="period"><option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option></select></label>
          </div>
          {can(u, "reports.sensitive") && <label className="consent" style={{ marginTop: 12 }}><input type="checkbox" name="sensitive" value="1" /> Include full Civil ID numbers (administrators only — logged)</label>}
          <p className="muted small" style={{ marginTop: 10 }}>These filters apply to whichever report you download below.</p>
        </section>
        <div className="k-grid k-g3">
          {list.map(([k, title]) => (
            <section key={k} className="k-card rep">
              <h3><Icon name={ABOUT[k]?.[0] || "chart"} />{title}</h3>
              <p>{ABOUT[k]?.[1]}</p>
              <div className="row"><button className="btn btn-sm btn-primary" name="rf" value={k + ".xlsx"}>Excel</button><button className="btn btn-sm" name="rf" value={k + ".csv"}>CSV</button><button className="btn btn-sm" name="rf" value={k + ".pdf"}>PDF</button></div>
            </section>))}
        </div>
      </form>
    </>
  );
}
