import Link from "next/link";
import Icon from "@/components/Icon";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm, ROLES } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";
import { maskCivil } from "@/lib/security";
import { saveCategory, approveAccess, rejectAccess } from "@/lib/admin-actions";

const PER = 50;

export default async function Users({ searchParams }) {
  const me = await requirePerm("users");
  const pending = db.prepare("SELECT * FROM users WHERE account_status = 'pending' ORDER BY id").all();
  const roleOpts = Object.entries(ROLES).filter(([k]) => k !== "member" && (k !== "super_admin" || me.role === "super_admin"));
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const w = [], a = [];
  if (sp.q) { w.push("(u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.membership_id LIKE ? OR u.username LIKE ?)"); a.push(...Array(5).fill("%" + sp.q + "%")); }
  if (sp.role) { w.push("u.role = ?"); a.push(sp.role); }
  const where = w.length ? "WHERE " + w.join(" AND ") : "";
  const total = db.prepare(`SELECT COUNT(*) n FROM users u ${where}`).get(...a).n;
  const users = db.prepare(`SELECT u.*, c.name cat,
      (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) requests,
      (SELECT COUNT(*) FROM passes p JOIN bookings b ON b.id = p.booking_id WHERE b.user_id = u.id AND p.status = 'valid') passes
    FROM users u LEFT JOIN membership_categories c ON c.id = u.category_id ${where} ORDER BY u.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`).all(...a);
  const cats = db.prepare("SELECT * FROM membership_categories ORDER BY id").all();
  const qs = (x) => "?" + new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.role && { role: sp.role }), ...x });
  return (
    <>
      <Head title="Users & Members" sub={`${total} accounts`}>
        <a className="btn btn-ghost" href="/admin/export/?report=members&format=xlsx">Members (Excel)</a>
        <Link className="btn btn-primary" href="/admin/users/new/"><Icon name="users" />Add user / staff</Link>
      </Head>
      {sp.saved && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Saved.</div>}
      {pending.length > 0 && (
        <section className="a-card" style={{ marginBottom: 20, borderColor: "rgba(242,138,30,.5)" }}>
          <h2>Access requests <span className="pill warn">{pending.length} waiting</span></h2>
          {pending.map((x) => (
            <form key={x.id} action={approveAccess} className="a-request">
              <input type="hidden" name="id" value={x.id} />
              <div><b>{x.name}</b> <span className="mono muted">@{x.username}</span><br /><small className="muted">{x.email} · {x.mobile} · requested {fmtDT(x.created_at)}</small>
                {x.request_note && <p style={{ margin: "6px 0 0", fontSize: 14 }}>“{x.request_note}”</p>}</div>
              <select className="input" name="role" defaultValue={x.role} aria-label={"Role for " + x.name}>{roleOpts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <div className="btn-row"><button className="btn btn-primary btn-sm" data-approve>Approve</button><button className="btn btn-ghost btn-sm" formAction={rejectAccess}>Reject</button></div>
            </form>
          ))}
        </section>
      )}
      <form className="a-filters" method="get">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Name, username, email, mobile, membership ID" style={{ gridColumn: "span 2" }} />
        <select className="input" name="role" defaultValue={sp.role}><option value="">All roles</option>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <div className="btn-row"><button className="btn btn-primary">Search</button><Link className="btn btn-ghost" href="/admin/users/">Reset</Link></div>
      </form>
      <div className="a-table-wrap"><table className="a-table">
        <thead><tr><th>ID</th><th>Username</th><th>Membership ID</th><th>Name</th><th>Mobile</th><th>Email</th><th>Nationality</th><th>Civil ID</th><th>Role</th><th>Category</th><th>Membership</th><th>Account</th><th>Requests</th><th>Passes</th><th>Registered</th><th>Last login</th><th></th></tr></thead>
        <tbody>{users.map((x) => (
          <tr key={x.id}><td>{x.id}</td><td className="mono">{x.username || "—"}</td><td className="mono">{x.membership_id || "—"}</td><td>{x.name}{!x.email_verified && <small className="muted"> · unverified</small>}</td><td className="nowrap">{x.mobile}</td><td>{x.email}</td><td>{x.nationality}</td>
            <td className="nowrap">{maskCivil(x.civil_last4) || "—"}</td><td>{ROLES[x.role]}</td><td>{x.cat || "—"}</td><td>{x.membership_status}</td><td>{x.account_status}</td><td>{x.requests}</td><td>{x.passes}</td>
            <td className="nowrap">{fmtDT(x.created_at)}</td><td className="nowrap">{fmtDT(x.last_login) || "—"}</td><td><Link className="btn btn-ghost btn-sm" href={`/admin/users/${x.id}/`}>Edit</Link></td></tr>))}</tbody>
      </table></div>
      <div className="a-pager">{page > 1 && <Link className="btn btn-ghost btn-sm" href={qs({ page: page - 1 })}>← Previous</Link>}<span className="muted">Page {page}</span>{page * PER < total && <Link className="btn btn-ghost btn-sm" href={qs({ page: page + 1 })}>Next →</Link>}</div>

      <section className="a-card" id="categories" style={{ marginTop: 30 }}>
        <h2>Membership categories</h2>
        <p className="muted" style={{ fontSize: 14 }}>New members join the first active category. Change a member’s category on their account.</p>
        {cats.map((c) => (
          <form key={c.id} action={saveCategory} className="a-inline"><input type="hidden" name="id" value={c.id} />
            <input className="input" name="name" defaultValue={c.name} aria-label="Category name" /><input className="input" name="benefits" defaultValue={c.benefits} aria-label="Benefits" style={{ flex: 2 }} />
            <label className="consent"><input type="checkbox" name="active" defaultChecked={!!c.active} /> Active</label><button className="btn btn-ghost btn-sm">Save</button></form>))}
        <form action={saveCategory} className="a-inline"><input className="input" name="name" placeholder="New category name" aria-label="New category" /><input className="input" name="benefits" placeholder="Benefits" aria-label="Benefits" style={{ flex: 2 }} /><button className="btn btn-primary btn-sm">Add</button></form>
      </section>
    </>
  );
}
