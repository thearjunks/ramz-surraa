import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { routeTreeVersions } from "@/lib/route-tree";

export default async function Collections({ searchParams }) {
  await requirePerm("content");
  const q = String((await searchParams)?.q || "").trim().toLowerCase();
  const rows = db.prepare("SELECT t.id,t.name,t.slug,COUNT(e.id) entries FROM cms_collection_types t LEFT JOIN cms_collection_entries e ON e.type_id=t.id GROUP BY t.id ORDER BY t.name").all().filter((r) => !q || `${r.name} ${r.slug}`.toLowerCase().includes(q));
  const countItems = (slug, type) => routeTreeVersions(slug).draft.filter((node) => node.type === type).reduce((sum,node) => sum + (node.items?.length || 0), 0);
  const builtIn = [
    ["Artists", "artists", countItems("artists","artist-group"), "/cms/routes/artists/"],
    ["Gallery images", "gallery", countItems("gallery","gallery"), "/cms/routes/gallery/"],
    ["Events", "events", db.prepare("SELECT COUNT(*) n FROM events").get().n, "/cms/collections/events/"],
  ];
  return <>
    <Head title="Collection types" sub="Define content fields and manage repeatable entries."><Link className="btn btn-primary" href="/cms/collections/new/">New collection type</Link></Head>
    <form method="get" className="a-inline" style={{ marginBottom: 18 }}><input className="input" name="q" defaultValue={q} placeholder="Search collection types" aria-label="Search collection types" /><button className="btn btn-ghost btn-sm">Search</button></form>
    <section className="a-card" style={{ marginBottom: 20 }}><h2>Existing website collections</h2><p className="muted">These records already power the live website. Open their editors to change the source data.</p>
      <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Name</th><th>Key</th><th>Entries</th><th>Actions</th></tr></thead><tbody>
        {builtIn.filter(([name, key]) => !q || `${name} ${key}`.toLowerCase().includes(q)).map(([name, key, count, href]) => <tr key={key}><td>{name}</td><td>{key}</td><td>{count}</td><td><Link href={href}>Manage entries</Link></td></tr>)}
      </tbody></table></div></section>
    <h2>Custom collection types</h2>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Name</th><th>Key</th><th>Entries</th><th></th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.slug}</td><td>{row.entries}</td><td><Link href={`/cms/collections/${row.id}/`}>Manage</Link></td></tr>)}
      {!rows.length && <tr><td colSpan="4">No custom collection types yet. Existing website collections are listed above.</td></tr>}
    </tbody></table></div>
  </>;
}
