import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, Kpi, PayTag, Empty, kd } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { bookingQuery } from "@/lib/admin-query";

export const metadata = { title: "Payments" };
const TABS = [["open", "Still owed"], ["paid", "Paid"], ["all", "All"]];

export default async function Payments({ searchParams }) {
  await requirePerm("payments");
  const sp = await searchParams;
  const tab = TABS.find((t) => t[0] === sp.pay)?.[0] || "open";
  const all = bookingQuery({ q: sp.q, event: sp.event, status: "confirmed_any" }).rows.filter((r) => r.pay_total > 0 || r.pay_received > 0);
  const owed = (r) => Math.max(0, r.pay_total - r.pay_received);
  const rows = all.filter((r) => tab === "all" || (tab === "paid" ? ["paid", "waived"].includes(r.pay_status) : !["paid", "waived", "refunded"].includes(r.pay_status)));
  const sum = (f) => all.reduce((s, r) => s + f(r), 0);
  const events = db.prepare("SELECT id, name FROM events ORDER BY date DESC").all();
  const q = (x) => "/cms/payments/?" + new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.event && { event: sp.event }), ...x });
  return (
    <>
      <Head title="Payments" sub="Internal payments for confirmed bookings. Customers never see these amounts.">
        <a className="btn" href={`/cms/export/?report=payments&format=xlsx${sp.event ? "&event=" + sp.event : ""}`}><Icon name="download" />Payment report</a>
      </Head>
      <div className="k-grid k-g3" style={{ marginBottom: 18 }}>
        <Kpi label="Total due" value={kd(sum((r) => r.pay_total))} hint={`${all.length} confirmed bookings with a charge`} />
        <Kpi label="Received" value={kd(sum((r) => r.pay_received))} />
        <Kpi label="Still owed" value={kd(sum(owed))} hint={`${all.filter((r) => owed(r) > 0).length} bookings`} />
      </div>
      <nav className="chips">{TABS.map(([k, t]) => <Link key={k} href={q({ pay: k })} aria-current={tab === k ? "page" : undefined}>{t}</Link>)}</nav>
      <form className="toolbar" method="get"><input type="hidden" name="pay" value={tab} />
        <input className="grow" type="search" name="q" defaultValue={sp.q} placeholder="Name, mobile or reference" aria-label="Search" />
        <select name="event" defaultValue={sp.event} aria-label="Event"><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <button className="btn btn-dark">Search</button>
      </form>
      <div className="tbl"><div className="tbl-scroll"><table className="resp">
        <thead><tr><th>Customer</th><th>Event</th><th className="num">Passes</th><th className="num">Total</th><th className="num">Received</th><th className="num">Owed</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td className="c-main"><Link className="rowlink" href={`/cms/bookings/${r.id}/`}>{r.name}</Link><span className="k-sub mono">{r.ref}</span></td>
            <td className="c-wide"><span className="k-sub" style={{ marginTop: 0 }}>{r.event_name}</span></td>
            <td className="num" data-hide>{r.quantity}</td>
            <td className="num" data-hide>{kd(r.pay_total)}</td><td className="num" data-hide>{kd(r.pay_received)}</td>
            <td className="num c-side"><b>{kd(owed(r))}</b></td>
            <td className="c-wide"><PayTag s={r.pay_status} />{r.pay_method ? <span className="muted small"> · {r.pay_method}</span> : null}</td>
            <td data-hide><Link className="btn btn-sm" href={`/cms/bookings/${r.id}/`}>Record payment</Link></td>
          </tr>))}</tbody>
      </table>
        {!rows.length && <Empty title={tab === "open" ? "Nothing is owed" : "No payments found"}>{tab === "open" ? "Every confirmed booking with a charge is paid." : ""}</Empty>}
      </div></div>
    </>
  );
}
