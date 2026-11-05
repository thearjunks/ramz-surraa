import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, StatusTag, PayTag, kd } from "@/components/admin/ui";
import { BulkDeleteButton, ConfirmButton, Presets, SelectAll } from "@/components/admin/Client";
import { db } from "@/lib/db";
import { requirePerm, can } from "@/lib/auth";
import { STATUS, fmtDT, sweepExpired } from "@/lib/bookings";
import { bookingQuery, FILTER_KEYS, PAYMENT_STATUS } from "@/lib/admin-query";
import { maskCivil } from "@/lib/security";
import { bulkDeleteBookings, bulkStatus, deleteBooking } from "@/lib/admin-actions";

const PER = 25;

export default async function Bookings({ searchParams }) {
  const u = await requirePerm("bookings.view");
  sweepExpired();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, passes } = bookingQuery(sp, { limit: PER, offset: (page - 1) * PER });
  const events = db.prepare("SELECT id, event_code, name FROM events ORDER BY date DESC").all();
  const finance = can(u, "payments");
  const qs = (extra) => "?" + new URLSearchParams({ ...Object.fromEntries(FILTER_KEYS.filter((k) => sp[k]).map((k) => [k, sp[k]])), ...extra }).toString();
  const exportQs = qs({});

  return (
    <>
      <Head title="Bookings" sub={`${total} requests · ${passes} passes match your filters`}>
        <a className="btn btn-ghost" href={"/admin/export/" + exportQs + "&report=bookings&format=xlsx"}><Icon name="sliders" />Excel</a>
        <a className="btn btn-ghost" href={"/admin/export/" + exportQs + "&report=bookings&format=csv"}>CSV</a>
        <a className="btn btn-ghost" href={"/admin/export/" + exportQs + "&report=bookings&format=pdf"}>PDF</a>
      </Head>
      {sp.bulk !== undefined && <div className={"notice " + (sp.bulk === "0" ? "err" : "ok")} style={{ display: "block", marginBottom: 14 }}>{sp.bulk === "0" ? "Bulk update not applied — select bookings, a status, and tick the confirmation box." : `${sp.bulk} bookings updated.`}</div>}
      {sp.deleted && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Booking and its related records were deleted.</div>}
      {sp.bulkDeleted && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>{sp.bulkDeleted} selected booking{sp.bulkDeleted === "1" ? "" : "s"} and related records were deleted.</div>}

      <form className="a-filters" method="get">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Reference, name, mobile, email, serial, member ID…" style={{ gridColumn: "span 2" }} />
        <select className="input" name="event" defaultValue={sp.event}><option value="">All events</option>{events.map((e) => <option key={e.id} value={e.id}>{e.event_code} · {e.name}</option>)}</select>
        <select className="input" name="status" defaultValue={sp.status}><option value="">Any status</option><option value="open_requests">Pending (all open)</option><option value="confirmed_any">Confirmed (incl. checked in)</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {finance && <select className="input" name="payment" defaultValue={sp.payment}><option value="">Any payment</option>{Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
        <select className="input" name="type" defaultValue={sp.type}><option value="">Member & guest</option><option value="member">Members</option><option value="guest">Guests</option></select>
        <select className="input" name="checked" defaultValue={sp.checked}><option value="">Check-in: any</option><option value="yes">Checked in</option><option value="no">Not checked in</option></select>
        <input className="input" name="nationality" defaultValue={sp.nationality} placeholder="Nationality" />
        <input className="input" name="qty" type="number" min="1" defaultValue={sp.qty} placeholder="Pass qty" />
        <label className="a-lbl">Submitted from<input className="input" type="date" name="from" defaultValue={sp.from} /></label>
        <label className="a-lbl">to<input className="input" type="date" name="to" defaultValue={sp.to} /></label>
        <label className="a-lbl">Event date from<input className="input" type="date" name="event_from" defaultValue={sp.event_from} /></label>
        <label className="a-lbl">to<input className="input" type="date" name="event_to" defaultValue={sp.event_to} /></label>
        <select className="input" name="sort" defaultValue={sp.sort}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="event">Event date</option><option value="name">Name A–Z</option><option value="qty">Most passes</option><option value="status">Status</option></select>
        <div className="btn-row"><button className="btn btn-primary">Apply</button><Link className="btn btn-ghost" href="/admin/bookings/">Reset</Link></div>
      </form>
      <Presets />

      <form action={bulkStatus}>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr><th><SelectAll /></th><th>Reference</th><th>Event</th><th>Type</th><th>Customer</th><th>Mobile</th><th>Email</th><th>Nationality</th><th>Civil ID</th>
              <th>Qty</th><th>Status</th>{finance && <><th>Payment</th><th>Internal total</th></>}<th>Submitted</th><th>Source</th><th>Confirmed</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" name="ids" value={r.id} aria-label={"Select " + r.ref} /></td>
                  <td><Link href={`/admin/bookings/${r.id}/`} className="mono strong">{r.ref}</Link></td>
                  <td><span className="mono">{r.event_code}</span><br /><small>{r.event_name}</small></td>
                  <td>{r.user_type === "member" ? <span title={r.membership_id}>Member</span> : "Guest"}</td>
                  <td>{r.name}</td><td className="nowrap">{r.mobile}</td><td>{r.email}</td><td>{r.nationality}</td><td className="nowrap">{maskCivil(r.civil_last4)}</td>
                  <td>{r.quantity}{r.checked ? <small> · {r.checked} in</small> : null}</td><td><StatusTag s={r.status} /></td>
                  {finance && <><td><PayTag s={r.pay_status} /></td><td className="nowrap">{kd(r.pay_total)}</td></>}
                  <td className="nowrap">{fmtDT(r.created_at)}</td>
                  <td>{r.page_url ? <a href={r.page_url} target="_blank" rel="noopener" title={r.page_url}>link</a> : "—"}</td>
                  <td className="nowrap">{r.confirmed_at ? <>{fmtDT(r.confirmed_at)}<br /><small>{r.confirmed_by_name}</small></> : "—"}</td>
                  <td><div className="btn-row" style={{ flexWrap: "nowrap" }}><Link className="btn btn-ghost btn-sm" href={`/admin/bookings/${r.id}/`}>Open</Link>
                    {can(u, "bookings.delete") && <ConfirmButton className="btn btn-ghost btn-sm" formAction={deleteBooking} name="delete" value={`${r.id}|${r.ref}`} message={`Permanently delete ${r.ref} and all related records? This cannot be undone.`}>Delete</ConfirmButton>}</div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="17" className="muted" style={{ padding: 30, textAlign: "center" }}>No bookings match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="a-bulk">
          <span className="muted">With selected:</span>
          <select className="input" name="status" defaultValue=""><option value="">Choose status…</option><option value="under_review">Under Review</option><option value="contacted">Contacted</option><option value="awaiting">Awaiting Completion</option><option value="cancelled">Cancel</option><option value="expired">Expire</option></select>
          <label className="consent"><input type="checkbox" name="confirm" value="yes" /> I checked the selection</label>
          <button className="btn btn-ghost btn-sm">Apply to selected</button>
          {can(u, "bookings.delete") && <BulkDeleteButton action={bulkDeleteBookings} />}
          <small className="muted">Confirmations are done one booking at a time.</small>
        </div>
      </form>

      <div className="a-pager">
        {page > 1 && <Link className="btn btn-ghost btn-sm" href={"/admin/bookings/" + qs({ page: page - 1 })}>← Previous</Link>}
        <span className="muted">Page {page} of {Math.max(1, Math.ceil(total / PER))}</span>
        {page * PER < total && <Link className="btn btn-ghost btn-sm" href={"/admin/bookings/" + qs({ page: page + 1 })}>Next →</Link>}
      </div>
    </>
  );
}
