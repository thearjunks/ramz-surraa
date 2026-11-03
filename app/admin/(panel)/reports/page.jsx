import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { REPORTS } from "@/lib/reports";

export default async function Reports() {
  const u = await requirePerm("reports");
  const events = db.prepare("SELECT id, event_code, name FROM events ORDER BY date DESC").all();
  const list = Object.entries(REPORTS).filter(([k]) => k !== "payments" || can(u, "reports.finance") || can(u, "payments"));
  return (
    <>
      <Head title="Reports & exports" sub="Every export records who downloaded it. Civil IDs are masked unless an administrator ticks “include full Civil ID”." />
      <section className="a-card">
        <form action="/admin/export/" method="get" className="form a-form3">
          <div className="field"><label htmlFor="r">Report</label><select id="r" className="input" name="report">{list.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="ev">Event</label><select id="ev" className="input" name="event"><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.event_code} · {e.name}</option>)}</select></div>
          <div className="field"><label htmlFor="fm">Format</label><select id="fm" className="input" name="format"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV</option><option value="pdf">PDF</option></select></div>
          <div className="field"><label htmlFor="fr">Submitted from</label><input id="fr" className="input" type="date" name="from" /></div>
          <div className="field"><label htmlFor="to">Submitted to</label><input id="to" className="input" type="date" name="to" /></div>
          <div className="field"><label htmlFor="pe">Period (for the daily/weekly/monthly report)</label><select id="pe" className="input" name="period"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          {can(u, "reports.sensitive") && <div className="field full"><label className="consent"><input type="checkbox" name="sensitive" value="1" /> Include full Civil ID numbers (administrators only — this download is logged)</label></div>}
          <div className="full"><button className="btn btn-primary">Download report</button></div>
        </form>
      </section>
      <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>Tip: on the Bookings page, the Excel / CSV / PDF buttons export exactly the rows matching your current filters.</p>
    </>
  );
}
