import { Head, Stat, Bars, Meters, kd } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eventStats, eventEnd, sweepExpired } from "@/lib/bookings";
import { verifyPassword } from "@/lib/security";
import Link from "next/link";

export default async function Dashboard({ searchParams }) {
  const u = await requirePerm(null);
  if (!can(u, "dashboard")) {
    if (can(u, "content")) redirect("/cms/");
    return <Head title="Welcome" sub="Use QR Check-in from the menu." />;
  }
  sweepExpired();
  const q = (sql, ...a) => db.prepare(sql).get(...a);
  const events = db.prepare("SELECT * FROM events WHERE status != 'draft' ORDER BY date").all();
  const upcoming = events.filter((e) => eventEnd(e).getTime() >= Date.now() && e.status !== "cancelled");
  const b = q(`SELECT COUNT(*) total,
      SUM(status IN ('pending','under_review','contacted','awaiting')) pending, SUM(status IN ('confirmed','checked_in')) confirmed,
      SUM(status IN ('rejected','cancelled')) closed, COALESCE(SUM(CASE WHEN status IN ('confirmed','checked_in') THEN quantity END),0) passes FROM bookings`);
  const members = q("SELECT COUNT(*) n FROM users WHERE role = 'member'").n;
  const guests = q("SELECT COUNT(DISTINCT email) n FROM bookings WHERE user_type = 'guest'").n;
  const checkins = q("SELECT COUNT(*) n FROM passes WHERE checked_in_at IS NOT NULL").n;
  const stats = upcoming.map((e) => [e, eventStats(e.id)]);
  const available = stats.reduce((s, [, x]) => s + x.available, 0);

  // last 14 days (Kuwait days)
  const days = [...Array(14)].map((_, i) => new Date(Date.now() + 3 * 3600e3 - (13 - i) * 864e5).toISOString().slice(0, 10));
  const perDay = Object.fromEntries(db.prepare(`SELECT date(created_at, '+3 hours') d, COUNT(*) n, SUM(quantity) q FROM bookings WHERE created_at >= ? GROUP BY d`)
    .all(new Date(Date.now() - 15 * 864e5).toISOString()).map((r) => [r.d, r]));
  const lbl = (d) => d.slice(8) + "/" + d.slice(5, 7);
  const growth = db.prepare("SELECT strftime('%Y-%m', created_at) m, COUNT(*) n FROM users WHERE role = 'member' GROUP BY m ORDER BY m DESC LIMIT 12").all().reverse();
  const byEvent = db.prepare(`SELECT e.event_code, e.name, COUNT(b.id) n, COALESCE(SUM(b.quantity),0) q FROM events e LEFT JOIN bookings b ON b.event_id = e.id
    WHERE e.status != 'draft' GROUP BY e.id ORDER BY e.date DESC LIMIT 8`).all();
  const pay = can(u, "payments") && db.prepare(`SELECT p.status, COUNT(*) n, SUM(p.total) total, SUM(p.received) received FROM payments p JOIN bookings b ON b.id = p.booking_id
    WHERE b.status NOT IN ('rejected','cancelled','expired') GROUP BY p.status`).all();
  const att = db.prepare(`SELECT e.event_code, e.name, COUNT(p.id) issued, SUM(p.checked_in_at IS NOT NULL) inn FROM events e JOIN passes p ON p.event_id = e.id AND p.status = 'valid' GROUP BY e.id ORDER BY e.date DESC LIMIT 6`).all();
  const sp = await searchParams;

  return (
    <>
      <Head title="Dashboard" sub={`Welcome back, ${u.name.split(" ")[0]}.`} />
      {verifyPassword("AK1AK", u.password_hash) && <div className="notice err" style={{ display: "block", marginBottom: 16 }}>Your password is still the short starter password. <Link href={`/admin/users/${u.id}/`} style={{ textDecoration: "underline" }}>Change it now</Link> — use at least 8 characters.</div>}
      {db.prepare("SELECT COUNT(*) n FROM users WHERE account_status = 'pending'").get().n > 0 && can(u, "users") && <div className="notice ok" style={{ display: "block", marginBottom: 16 }}><Link href="/admin/users/" style={{ textDecoration: "underline" }}>New access requests are waiting for approval.</Link></div>}
      {sp.denied && <div className="notice err" style={{ display: "block", marginBottom: 16 }}>You don't have access to that page.</div>}
      <div className="a-stats">
        <Stat label="Pending confirmations" value={b.pending || 0} href="/admin/bookings/?status=open_requests" tone="warn" />
        <Stat label="Confirmed bookings" value={b.confirmed || 0} hint={`${b.passes} passes issued`} href="/admin/bookings/?status=confirmed_any" tone="up" />
        <Stat label="Entry pass requests" value={b.total} href="/admin/bookings/" />
        <Stat label="Cancelled / rejected" value={b.closed || 0} />
        <Stat label="Events" value={events.length} hint={`${upcoming.length} upcoming`} href="/admin/events/" />
        <Stat label="Available capacity" value={available} hint="across upcoming events" />
        <Stat label="Registered members" value={members} href="/admin/users/" />
        <Stat label="Guest customers" value={guests} />
        <Stat label="Check-ins" value={checkins} href="/admin/checkin/" />
        {pay && <Stat label="Internal payments" value={kd(pay.reduce((s, r) => s + (r.received || 0), 0))} hint={`of ${kd(pay.reduce((s, r) => s + (r.total || 0), 0))} due`} />}
      </div>
      <div className="a-grid">
        <Bars title="Daily booking requests (14 days)" data={days.map((d) => [lbl(d), perDay[d]?.n || 0])} />
        <Bars title="Entry passes requested per day" data={days.map((d) => [lbl(d), perDay[d]?.q || 0])} tone="sun" />
        <Bars title="Bookings per event" data={byEvent.map((r) => [r.event_code, r.n])} />
        <Meters title="Confirmed vs pending (passes)" rows={stats.map(([e, s]) => [e.name, s.confirmed, s.confirmed + s.pending, `${s.pending} pending`])} />
        <Meters title="Capacity utilisation" rows={stats.map(([e, s]) => [e.name, s.used, e.capacity - e.reserved, `${s.available} available · ${e.reserved} reserved`])} />
        <Bars title="Membership growth (new members per month)" data={growth.map((r) => [r.m.slice(5) + "/" + r.m.slice(2, 4), r.n])} />
        <Meters title="Attendance & check-in" rows={att.map((r) => [r.name, r.inn || 0, r.issued])} />
        {pay && <Meters title="Payment status (admin only)" rows={pay.map((r) => [r.status, r.n, b.total, `${kd(r.received)} received of ${kd(r.total)}`])} />}
      </div>
    </>
  );
}
