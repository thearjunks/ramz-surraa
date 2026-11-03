import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export default async function Collections() {
  await requirePerm("content");
  const rows = db.prepare("SELECT t.id,t.name,t.slug,COUNT(e.id) entries FROM cms_collection_types t LEFT JOIN cms_collection_entries e ON e.type_id=t.id GROUP BY t.id ORDER BY t.name").all();
  return <>
    <Head title="Collection types" sub="Define content fields and manage repeatable entries."><Link className="btn btn-primary" href="/cms/collections/new/">New collection type</Link></Head>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Name</th><th>Key</th><th>Entries</th><th></th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.slug}</td><td>{row.entries}</td><td><Link href={`/cms/collections/${row.id}/`}>Manage</Link></td></tr>)}
      {!rows.length && <tr><td colSpan="4">No collection types yet.</td></tr>}
    </tbody></table></div>
  </>;
}
