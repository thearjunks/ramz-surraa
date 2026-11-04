import Icon from "@/components/Icon";
import { Head, Empty } from "@/components/cms/ui";
import Scanner from "@/components/cms/Scanner";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { fmtDT, eventEnd, eventStats } from "@/lib/bookings";

export const metadata = { title: "Door check-in" };
const RES = { checked_in: ["up", "Admitted"], already_used: ["warn", "Already used"], denied: ["err", "Denied"] };

export default async function CheckIn() {
  const u = await requirePerm("checkin");
  const next = db.prepare("SELECT * FROM events WHERE status NOT IN ('draft','cancelled') ORDER BY date, start_time").all().find((e) => eventEnd(e).getTime() >= Date.now() - 6 * 3600e3);
  const s = next && eventStats(next.id);
  const recent = db.prepare(`SELECT c.*, e.event_code, u.name by_name, p.holder FROM checkins c LEFT JOIN events e ON e.id = c.event_id
    LEFT JOIN users u ON u.id = c.by_user LEFT JOIN passes p ON p.id = c.pass_id ORDER BY c.id DESC LIMIT 15`).all();
  return (
    <>
      <Head title="Door check-in" sub="Scan the QR code on each entry pass. Every pass works once.">
        {can(u, "reports") && <a className="btn" href="/cms/export/?report=attendance&format=xlsx"><Icon name="download" />Attendance (Excel)</a>}
      </Head>
      <div className="scan-wrap">
        <section className="k-card"><Scanner /></section>
        <div className="k-stack">
          {next && <section className="k-card">
            <div className="card-h"><h2>{next.name}</h2></div>
            <div className="money" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div><small>Checked in</small><b style={{ fontSize: 26 }}>{s.checkedIn}</b></div>
              <div><small>Passes confirmed</small><b style={{ fontSize: 26 }}>{s.confirmed}</b></div>
            </div>
            <div className="k-meter-bar"><i className="c" style={{ width: `${s.confirmed ? (s.checkedIn / s.confirmed) * 100 : 0}%` }} /></div>
            <p className="muted small" style={{ marginTop: 8 }}>{Math.max(0, s.confirmed - s.checkedIn)} guests still to arrive. Refresh the page to update.</p>
          </section>}
          <section className="k-card">
            <div className="card-h"><h2>Latest scans</h2></div>
            {recent.length ? recent.map((r) => (
              <div key={r.id} className="who" style={{ justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <span><b style={{ fontSize: 14 }}>{r.holder || "Unknown pass"}</b><small className="muted" style={{ display: "block" }}>{r.serial} · {fmtDT(r.at)} · {r.by_name}</small></span>
                <span className={"pill " + (RES[r.result]?.[0] || "")}>{RES[r.result]?.[1] || r.result}</span>
              </div>)) : <Empty title="No scans yet">Check-ins will appear here.</Empty>}
          </section>
        </div>
      </div>
    </>
  );
}
