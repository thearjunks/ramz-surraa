import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";

const PER = 100;

export default async function Audit({ searchParams }) {
  await requirePerm("audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q ? "%" + sp.q + "%" : null;
  const where = q ? "WHERE a.action LIKE ? OR a.entity_id LIKE ? OR a.details LIKE ? OR u.name LIKE ?" : "";
  const args = q ? [q, q, q, q] : [];
  const rows = db.prepare(`SELECT a.*, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where} ORDER BY a.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`).all(...args);
  return (
    <>
      <Head title="Audit log" sub="Status changes, payments, pass generation, check-ins, exports and sign-ins." />
      <form className="a-filters" method="get"><input className="input" name="q" defaultValue={sp.q} placeholder="Search action, reference, user…" style={{ gridColumn: "span 2" }} /><div className="btn-row"><button className="btn btn-primary">Search</button></div></form>
      <div className="a-table-wrap"><table className="a-table compact"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="nowrap">{fmtDT(r.at)}</td><td>{r.name || "System"}</td><td className="mono">{r.action}</td><td className="mono">{r.entity} {r.entity_id}</td><td className="break">{r.details}</td></tr>)}</tbody></table></div>
      <div className="a-pager">{page > 1 && <Link className="btn btn-ghost btn-sm" href={`?page=${page - 1}`}>← Newer</Link>}{rows.length === PER && <Link className="btn btn-ghost btn-sm" href={`?page=${page + 1}`}>Older →</Link>}</div>
    </>
  );
}
