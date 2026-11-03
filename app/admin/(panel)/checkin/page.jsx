import { Head } from "@/components/admin/ui";
import Scanner from "@/components/admin/Scanner";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";

const RES = { checked_in: "Checked in", already_used: "Already used", denied: "Denied" };

export default async function CheckIn() {
  await requirePerm("checkin");
  const recent = db.prepare(`SELECT c.*, e.event_code, u.name by_name, p.holder FROM checkins c LEFT JOIN events e ON e.id = c.event_id
    LEFT JOIN users u ON u.id = c.by_user LEFT JOIN passes p ON p.id = c.pass_id ORDER BY c.id DESC LIMIT 40`).all();
  return (
    <>
      <Head title="QR Check-in" sub="Scan official entry passes at the entrance. Each pass works once.">
        <a className="btn btn-ghost" href="/admin/export/?report=attendance&format=xlsx">Attendance report</a>
      </Head>
      <div className="a-cols">
        <section className="a-card"><Scanner /></section>
        <section className="a-card">
          <h2>Recent check-in records</h2>
          <div className="a-table-wrap"><table className="a-table compact"><thead><tr><th>Time</th><th>Serial</th><th>Holder</th><th>Event</th><th>Result</th><th>Verified by</th></tr></thead>
            <tbody>{recent.map((r) => <tr key={r.id}><td className="nowrap">{fmtDT(r.at)}</td><td className="mono">{r.serial}</td><td>{r.holder}</td><td>{r.event_code}</td><td>{RES[r.result] || r.result}</td><td>{r.by_name}</td></tr>)}
              {!recent.length && <tr><td colSpan="6" className="muted">No check-ins yet.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>
  );
}
