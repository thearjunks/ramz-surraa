import Link from "next/link";
import { Head, Empty } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";

export const metadata = { title: "Activity log" };
const PER = 60;
const LABEL = {
  "booking.status": "Changed a booking status", "booking.bulk_status": "Updated several bookings", "booking.edit": "Edited booking details", "booking.notes": "Updated booking notes",
  "payment.update": "Recorded a payment", "pass.checkin": "Scanned a pass at the door", "pass.reissue": "Replaced a pass QR code", "civil.view": "Viewed a Civil ID",
  "export": "Downloaded a report", "export.sensitive": "Downloaded a report with full Civil IDs", "event.create": "Created an event", "event.update": "Updated an event",
  "user.create": "Created an account", "user.update": "Updated an account", "user.signin": "Signed in", "user.register": "Member registered", "user.profile_update": "Member updated profile",
  "user.password_reset": "Reset a password", "user.email_verified": "Verified email", "access.request": "Asked for CMS access", "access.approve": "Approved CMS access",
  "access.reject": "Declined CMS access", "category.save": "Saved a membership type", "settings.update": "Changed settings",
};
const GROUPS = [["", "Everything"], ["booking", "Bookings"], ["payment", "Payments"], ["pass", "Check-in"], ["event", "Events"], ["user", "Accounts"], ["export", "Downloads"]];

export default async function Activity({ searchParams }) {
  await requirePerm("audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const w = [], a = [];
  if (sp.q) { w.push("(a.action LIKE ? OR a.entity_id LIKE ? OR a.details LIKE ? OR u.name LIKE ?)"); a.push(...Array(4).fill("%" + sp.q + "%")); }
  if (sp.g) { w.push("a.action LIKE ?"); a.push(sp.g + "%"); }
  const rows = db.prepare(`SELECT a.*, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY a.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`).all(...a);
  const qs = (x) => "/cms/audit/?" + new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.g && { g: sp.g }), ...x });
  return (
    <>
      <Head title="Activity log" sub="Who did what, and when. Nothing here can be edited or deleted." />
      <nav className="chips">{GROUPS.map(([k, t]) => <Link key={k} href={"/cms/audit/?" + new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(k && { g: k }) })} aria-current={(sp.g || "") === k ? "page" : undefined}>{t}</Link>)}</nav>
      <form className="toolbar" method="get">{sp.g && <input type="hidden" name="g" value={sp.g} />}
        <input className="grow" type="search" name="q" defaultValue={sp.q} placeholder="Search a person, reference or detail" aria-label="Search" /><button className="btn btn-dark">Search</button></form>
      <div className="tbl"><div className="tbl-scroll"><table className="resp">
        <thead><tr><th>When</th><th>Who</th><th>What happened</th><th>Details</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td data-hide className="nowrap small muted">{fmtDT(r.at)}</td>
            <td className="c-main"><b>{r.name || "System"}</b><span className="k-sub" style={{ display: "none" }} /></td>
            <td className="c-wide">{LABEL[r.action] || r.action}{r.entity_id ? <span className="mono muted"> · {r.entity_id}</span> : null}</td>
            <td className="c-wide small muted break">{r.details}</td>
          </tr>))}</tbody>
      </table>{!rows.length && <Empty title="Nothing found" />}</div>
        <div className="pager"><span>Page {page}</span><span className="row">{page > 1 && <Link className="btn btn-sm" href={qs({ page: page - 1 })}>← Newer</Link>}{rows.length === PER && <Link className="btn btn-sm" href={qs({ page: page + 1 })}>Older →</Link>}</span></div>
      </div>
    </>
  );
}
