import Link from "next/link";
import Icon from "@/components/Icon";
import { Head, Tabs, Empty, initials } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm, ROLES } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";
import { saveCategory, approveAccess, rejectAccess } from "@/lib/admin-actions";

export const metadata = { title: "Members & staff" };
const PER = 50;
const ROLE_INFO = [
  ["super_admin", "Everything, including other Super Administrators."], ["admin", "Everything except managing Super Administrators."],
  ["event_manager", "Events, booking requests, confirmations, check-in, reports."], ["booking_staff", "Booking requests (no confirmations), check-in, reports."],
  ["finance", "Payments and financial reports."], ["checkin", "Door check-in only."],
];

export default async function People({ searchParams }) {
  const me = await requirePerm("users");
  const sp = await searchParams;
  const pending = db.prepare("SELECT * FROM users WHERE account_status = 'pending' ORDER BY id").all();
  const tab = ["staff", "members", "requests", "categories"].includes(sp.tab) ? sp.tab : pending.length ? "requests" : "staff";
  const roleOpts = Object.entries(ROLES).filter(([k]) => k !== "member" && (k !== "super_admin" || me.role === "super_admin"));
  const nStaff = db.prepare("SELECT COUNT(*) n FROM users WHERE role != 'member' AND account_status != 'pending'").get().n;
  const nMembers = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'member'").get().n;
  const page = Math.max(1, Number(sp.page) || 1);
  let rows = [], total = 0;
  if (tab === "staff" || tab === "members") {
    const w = [tab === "staff" ? "u.role != 'member' AND u.account_status != 'pending'" : "u.role = 'member'"], a = [];
    if (sp.q) { w.push("(u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.membership_id LIKE ? OR u.username LIKE ?)"); a.push(...Array(5).fill("%" + sp.q + "%")); }
    const where = "WHERE " + w.join(" AND ");
    total = db.prepare(`SELECT COUNT(*) n FROM users u ${where}`).get(...a).n;
    rows = db.prepare(`SELECT u.*, c.name cat, (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) requests FROM users u
      LEFT JOIN membership_categories c ON c.id = u.category_id ${where} ORDER BY u.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`).all(...a);
  }
  const cats = db.prepare("SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.category_id = c.id) n FROM membership_categories c ORDER BY id").all();
  const T = (k) => "/cms/users/?tab=" + k;
  return (
    <>
      <Head title="Members & staff" sub="Team accounts that can use this CMS, and registered community members.">
        {tab === "members" && <a className="btn" href="/cms/export/?report=members&format=xlsx"><Icon name="download" />Members (Excel)</a>}
        <Link className="btn btn-primary" href={"/cms/users/new/" + (tab === "members" ? "?type=member" : "")}><Icon name="plus" />{tab === "members" ? "Add member" : "Add team member"}</Link>
      </Head>
      {sp.saved && <div className="notice ok" style={{ marginBottom: 14 }}>Saved.</div>}
      <Tabs items={[{ t: "Team", h: T("staff"), on: tab === "staff", n: nStaff }, { t: "Members", h: T("members"), on: tab === "members", n: nMembers },
        { t: "Access requests", h: T("requests"), on: tab === "requests", n: pending.length }, { t: "Membership types", h: T("categories"), on: tab === "categories" }]} />

      {tab === "requests" && (
        <section className="k-card">
          <div className="card-h"><h2><Icon name="shield" />People asking for CMS access</h2></div>
          {pending.length ? pending.map((x) => (
            <form key={x.id} action={approveAccess} className="req">
              <input type="hidden" name="id" value={x.id} />
              <div className="who"><span className="avatar">{initials(x.name)}</span><div><b>{x.name}</b> <span className="muted mono">@{x.username}</span><br /><small className="muted">{x.email} · {x.mobile} · {fmtDT(x.created_at)}</small>
                {x.request_note && <p className="small" style={{ marginTop: 4 }}>“{x.request_note}”</p>}</div></div>
              <select name="role" defaultValue={x.role} aria-label={"Access for " + x.name}>{roleOpts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <div className="row"><button className="btn btn-primary btn-sm"><Icon name="check" />Approve</button><button className="btn btn-danger btn-sm" formAction={rejectAccess}>Decline</button></div>
            </form>
          )) : <Empty title="No requests waiting">New staff can ask for access from the sign-in page.</Empty>}
        </section>
      )}

      {(tab === "staff" || tab === "members") && (
        <>
          <form className="toolbar" method="get"><input type="hidden" name="tab" value={tab} />
            <input className="grow" type="search" name="q" defaultValue={sp.q} placeholder={tab === "staff" ? "Name, username or email" : "Name, email, mobile or membership ID"} aria-label="Search" />
            <button className="btn btn-dark">Search</button>{sp.q && <Link className="btn btn-ghost" href={T(tab)}>Clear</Link>}
          </form>
          <div className="tbl"><div className="tbl-scroll"><table className="resp">
            <thead><tr><th>Name</th>{tab === "staff" ? <><th>Username</th><th>Access level</th></> : <><th>Membership</th><th>Requests</th></>}<th>Status</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.id}>
                <td className="c-main"><span className="who"><span className="avatar">{initials(x.name)}</span><span><Link className="rowlink" href={`/cms/users/${x.id}/`}>{x.name}</Link><span className="k-sub">{x.email}</span></span></span></td>
                {tab === "staff" ? <><td data-hide className="mono">{x.username || "—"}</td><td className="c-wide"><span className="tag">{ROLES[x.role]}</span></td></>
                  : <><td className="c-wide"><span className="mono small">{x.membership_id}</span>{x.cat && <span className="k-sub">{x.cat}</span>}</td><td data-hide>{x.requests}</td></>}
                <td className="c-side">{x.account_status === "active" ? <span className="pill up">Active</span> : <span className="pill past">{x.account_status}</span>}</td>
                <td data-hide className="small muted nowrap">{fmtDT(x.last_login) || "Never"}</td>
                <td data-hide><Link className="btn btn-sm" href={`/cms/users/${x.id}/`}>Edit</Link></td>
              </tr>))}</tbody>
          </table>
            {!rows.length && <Empty title="No one found">{sp.q ? "Try another search." : ""}</Empty>}
          </div>
            {total > PER && <div className="pager"><span>Page {page} · {total} people</span><span className="row">{page > 1 && <Link className="btn btn-sm" href={`${T(tab)}&page=${page - 1}`}>← Previous</Link>}{page * PER < total && <Link className="btn btn-sm" href={`${T(tab)}&page=${page + 1}`}>Next →</Link>}</span></div>}
          </div>
          {tab === "staff" && <section className="k-card" style={{ marginTop: 16 }}><h2 style={{ marginBottom: 12 }}>What each access level can do</h2>
            <div className="roles">{ROLE_INFO.map(([k, d]) => <div key={k} className="role-card"><b>{ROLES[k]}</b><span>{d}</span></div>)}</div></section>}
        </>
      )}

      {tab === "categories" && (
        <section className="k-card">
          <div className="card-h"><h2>Membership types</h2><span className="muted small">New members join the first active type.</span></div>
          <div className="k-stack">
            {cats.map((c) => (
              <form key={c.id} action={saveCategory} className="row" style={{ alignItems: "center" }}><input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} aria-label="Type name" style={{ maxWidth: 200 }} />
                <input name="benefits" defaultValue={c.benefits} aria-label="Benefits" style={{ flex: 1, minWidth: 200 }} />
                <label className="consent" style={{ alignItems: "center" }}><input type="checkbox" name="active" defaultChecked={!!c.active} /> Active</label>
                <span className="muted small">{c.n} members</span><button className="btn btn-sm">Save</button>
              </form>))}
            <form action={saveCategory} className="row" style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <input name="name" placeholder="New type, e.g. Family" aria-label="New type" style={{ maxWidth: 200 }} /><input name="benefits" placeholder="Benefits" aria-label="Benefits" style={{ flex: 1, minWidth: 200 }} />
              <button className="btn btn-primary btn-sm"><Icon name="plus" />Add type</button></form>
          </div>
        </section>
      )}
    </>
  );
}
