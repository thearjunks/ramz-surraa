import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STATUS, fmtDT, fmtDate, eventStart, eventEnd } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Entry Passes | SURRAA Community Association", ...noindex };

export default async function MyPasses() {
  const u = await requireUser("/account/passes/");
  // own requests + guest requests made earlier with the same (verified) email
  const rows = db.prepare(`SELECT b.*, e.name event_name, e.slug, e.date, e.start_time, e.end_time, e.poster,
      (SELECT COUNT(*) FROM passes p WHERE p.booking_id = b.id AND p.status = 'valid') passes
    FROM bookings b JOIN events e ON e.id = b.event_id
    WHERE b.user_id = ? OR (? = 1 AND b.email = ?) ORDER BY e.date DESC, b.id DESC`).all(u.id, u.email_verified, u.email);
  const upcoming = rows.filter((r) => eventEnd(r).getTime() >= Date.now()), past = rows.filter((r) => eventEnd(r).getTime() < Date.now());
  const list = (items) => items.map((b) => (
    <Link key={b.id} href={`/entry-pass/${b.access_token}/`} className="card pass-row">
      {b.poster && <img src={"/" + b.poster.replace(/^\//, "")} alt="" />}
      <div><b>{b.event_name}</b><div className="muted">{fmtDate(eventStart(b))}</div><small className="muted">{b.ref} · {b.quantity} pass{b.quantity > 1 ? "es" : ""} · requested {fmtDT(b.created_at)}</small></div>
      <span className={"pill " + (["confirmed", "checked_in"].includes(b.status) ? "up" : ["rejected", "cancelled", "expired"].includes(b.status) ? "past" : "warn")}>{STATUS[b.status]}</span>
    </Link>));
  return (
    <>
      <PageHero crumb="My Entry Passes"><h1>My <span className="grad">entry passes</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 900 }}>
        {!u.email_verified && <div className="m-banner"><Icon name="mail" /><span>Verify your email to also see requests you made as a guest with {u.email}.</span></div>}
        <h2 style={{ fontSize: 32, margin: "10px 0 16px" }}>Upcoming</h2>
        <div className="stack">{upcoming.length ? list(upcoming) : <p className="muted">No upcoming requests. <Link href="/events/" style={{ color: "var(--volt)" }}>Browse events</Link></p>}</div>
        <h2 style={{ fontSize: 32, margin: "40px 0 16px" }}>Booking history</h2>
        <div className="stack">{past.length ? list(past) : <p className="muted">Nothing yet.</p>}</div>
      </div></section>
    </>
  );
}
