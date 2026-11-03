import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export default async function Components() {
  await requirePerm("content");
  const rows = db.prepare("SELECT id, name, updated_at FROM cms_components ORDER BY name").all();
  return <>
    <Head title="Reusable components" sub="Edit a component once to update every page that uses it."><Link className="btn btn-primary" href="/cms/components/new/">New component</Link></Head>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Name</th><th>Updated</th><th></th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{new Date(row.updated_at).toLocaleString("en-GB")}</td><td><Link href={`/cms/components/${row.id}/`}>Edit</Link></td></tr>)}
      {!rows.length && <tr><td colSpan="3">No reusable components yet.</td></tr>}
    </tbody></table></div>
  </>;
}
