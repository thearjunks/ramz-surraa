import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, Tabs, StatusTag, PayTag, Empty, kd } from "@/components/cms/ui";
import { SelectAll, RowCheck, BulkBar } from "@/components/cms/Client";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { STATUS, fmtDT, sweepExpired } from "@/lib/bookings";
import { bookingQuery, FILTER_KEYS, PAYMENT_STATUS } from "@/lib/admin-query";
import { bulkStatus } from "@/lib/admin-actions";

export const metadata = { title: "Booking requests" };
const PER = 25;
// tab → status filter
const TABS = [
  ["action", "Needs action", "open_requests"],
  ["confirmed", "Confirmed", "confirmed"],
  ["checked", "Checked in", "checked_in"],
  ["closed", "Cancelled & closed", "closed"],
  ["all", "All", ""],
];
const ADV = ["payment", "type", "checked", "nationality", "qty", "from", "to", "event_from", "event_to", "sort", "status"];

export default async function Bookings({ searchParams }) {
  const u = await requirePerm("bookings.view");
  sweepExpired();
  const sp = await searchParams;
  const tab = TABS.find((t) => t[0] === sp.tab)?.[0] || (sp.q ? "all" : "action");
  const tabStatus = TABS.find((t) => t[0] === tab)[2];
  const params = { ...sp, status: sp.status || tabStatus };
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, passes } = bookingQuery(params, { limit: PER, offset: (page - 1) * PER });
  const base = { q: sp.q, event: sp.event };
  const counts = Object.fromEntries(TABS.map(([k, , s]) => [k, bookingQuery({ ...base, status: s }, { limit: 1 }).total]));
  const events = db.prepare("SELECT id, event_code, name FROM events ORDER BY date DESC").all();
  const finance = can(u, "payments");
  const keep = (extra = {}) => { const o = { ...Object.fromEntries(FILTER_KEYS.filter((k) => sp[k]).map((k) => [k, sp[k]])), tab, ...extra }; Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]); return "?" + new URLSearchParams(o).toString(); };
  const advOn = ADV.filter((k) => sp[k]).length;
  const exportQs = new URLSearchParams({ ...Object.fromEntries(FILTER_KEYS.filter((k) => params[k]).map((k) => [k, params[k]])), report: "bookings" }).toString();
  const evName = sp.event && events.find((e) => String(e.id) === String(sp.event));

  return (
    <>
      <Head title="Booking requests" sub={evName ? `${evName.name} · ${total} requests · ${passes} passes` : `${total} requests · ${passes} passes in this view`}>
        <details className="dropdown">
          <summary className="btn"><Icon name="download" />Export</summary>
          <div className="k-menu">
            <a href={`/cms/export/?${exportQs}&format=xlsx`}>Excel (.xlsx)</a>
            <a href={`/cms/export/?${exportQs}&format=csv`}>CSV</a>
            <a href={`/cms/export/?${exportQs}&format=pdf`}>PDF</a>
            <hr /><span className="muted small" style={{ display: "block", padding: "4px 10px" }}>Exports exactly what you see here.</span>
          </div>
        </details>
      </Head>
      {sp.bulk !== undefined && <div className={"notice " + (sp.bulk === "0" ? "err" : "ok")} style={{ marginBottom: 14 }}>{sp.bulk === "0" ? "Nothing changed — select at least one booking first." : `${sp.bulk} booking${sp.bulk === "1" ? "" : "s"} updated.`}</div>}

      <Tabs items={TABS.map(([k, t]) => ({ t, h: "/cms/bookings/" + new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.event && { event: sp.event }), tab: k }), on: tab === k, n: counts[k] }))} />

      <form method="get" action="/cms/bookings/">
        <input type="hidden" name="tab" value={tab} />
        <div className="toolbar">
          <input className="grow" type="search" name="q" defaultValue={sp.q} placeholder="Name, mobile, email, reference or pass serial" aria-label="Search" />
          <select name="event" defaultValue={sp.event} aria-label="Event"><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <button className="btn btn-dark">Search</button>
          {(sp.q || sp.event || advOn > 0) && <Link className="btn btn-ghost" href={"/cms/bookings/?tab=" + tab}>Clear</Link>}
        </div>
        <details className="more-filters" open={advOn > 0}>
          <summary><Icon name="filter" />More filters{advOn ? ` (${advOn} on)` : ""}</summary>
          <div className="mf">
            <label>Exact status<select name="status" defaultValue={sp.status}><option value="">Any in this tab</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            {finance && <label>Payment<select name="payment" defaultValue={sp.payment}><option value="">Any</option>{Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
            <label>Customer type<select name="type" defaultValue={sp.type}><option value="">Members & guests</option><option value="member">Members</option><option value="guest">Guests</option></select></label>
            <label>Checked in<select name="checked" defaultValue={sp.checked}><option value="">Any</option><option value="yes">Yes</option><option value="no">Not yet</option></select></label>
            <label>Nationality<input name="nationality" defaultValue={sp.nationality} placeholder="e.g. Sri Lankan" /></label>
            <label>Number of passes<input type="number" min="1" name="qty" defaultValue={sp.qty} /></label>
            <label>Submitted from<input type="date" name="from" defaultValue={sp.from} /></label>
            <label>Submitted to<input type="date" name="to" defaultValue={sp.to} /></label>
            <label>Event date from<input type="date" name="event_from" defaultValue={sp.event_from} /></label>
            <label>Event date to<input type="date" name="event_to" defaultValue={sp.event_to} /></label>
            <label>Sort by<select name="sort" defaultValue={sp.sort}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="event">Event date</option><option value="name">Name A–Z</option><option value="qty">Most passes</option></select></label>
            <label>&nbsp;<button className="btn btn-primary">Apply filters</button></label>
          </div>
        </details>
      </form>

      <form action={bulkStatus}>
        <div className="tbl"><div className="tbl-scroll">
          <table className="resp">
            <thead><tr>
              <th style={{ width: 36 }}><SelectAll /></th><th>Customer</th><th>Reference</th><th>Event</th><th className="num">Passes</th><th>Status</th>
              {finance && <th>Payment</th>}<th>Received</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="c-sel"><RowCheck id={r.id} label={"Select " + r.ref} /></td>
                  <td className="c-main"><Link className="rowlink" href={`/cms/bookings/${r.id}/`}>{r.name}</Link><span className="k-sub">{r.mobile}{r.user_type === "member" ? " · Member" : ""}</span></td>
                  <td data-hide><span className="mono">{r.ref}</span></td>
                  <td className="c-wide"><span className="k-sub" style={{ marginTop: 0 }}>{r.event_name}</span></td>
                  <td className="num c-side"><b>{r.quantity}</b>{r.checked ? <span className="k-sub">{r.checked} in</span> : null}</td>
                  <td className="c-wide"><StatusTag s={r.status} /></td>
                  {finance && <td data-hide>{r.pay_total > 0 ? <><PayTag s={r.pay_status} /><span className="k-sub">{kd(r.pay_total)}</span></> : <span className="muted small">Free</span>}</td>}
                  <td data-hide className="nowrap small muted">{fmtDT(r.created_at)}</td>
                  <td data-hide><Link className="btn btn-sm" href={`/cms/bookings/${r.id}/`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty title={tab === "action" && !sp.q ? "Nothing needs action" : "No bookings found"}>{tab === "action" && !sp.q ? "New entry pass requests will appear here." : "Try another search or clear the filters."}</Empty>}
        </div>
          {total > PER && <div className="pager">
            <span>Page {page} of {Math.ceil(total / PER)} · {total} requests</span>
            <span className="row">{page > 1 && <Link className="btn btn-sm" href={"/cms/bookings/" + keep({ page: page - 1 })}>← Previous</Link>}{page * PER < total && <Link className="btn btn-sm" href={"/cms/bookings/" + keep({ page: page + 1 })}>Next →</Link>}</span>
          </div>}
        </div>
        {can(u, "bookings.update") && <BulkBar />}
      </form>
    </>
  );
}
