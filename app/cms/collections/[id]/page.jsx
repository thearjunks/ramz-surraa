import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsFieldsBuilder from "@/components/admin/CmsFieldsBuilder";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { saveCmsCollection, deleteCmsEntry, deleteEmptyCmsCollection } from "@/lib/collection-actions";
import { ConfirmButton } from "@/components/admin/Client";

export default async function CollectionEditor({ params, searchParams }) {
  await requirePerm("content");
  const id = (await params).id;
  const sp = await searchParams;
  const type = id === "new" ? null : db.prepare("SELECT * FROM cms_collection_types WHERE id=?").get(Number(id));
  if (id !== "new" && !type) notFound();
  const allEntries = type ? db.prepare("SELECT id,data,published_data,status,updated_at FROM cms_collection_entries WHERE type_id=? ORDER BY id DESC").all(type.id) : [];
  const q = String(sp.q || "").trim().toLowerCase(), status = String(sp.status || ""), sort = String(sp.sort || "newest");
  const entries = allEntries.filter((e) => (!q || e.data.toLowerCase().includes(q)) && (!status || e.status === status));
  const firstKey = type ? JSON.parse(type.fields)[0]?.key : null;
  if (sort === "oldest") entries.reverse();
  if (sort === "name") entries.sort((a, b) => String(JSON.parse(a.data)[firstKey] || a.id).localeCompare(String(JSON.parse(b.data)[firstKey] || b.id)));
  const collections = db.prepare("SELECT id,name FROM cms_collection_types ORDER BY name").all().map((c) => ({ id: c.id, name: c.name }));
  return <>
    <Head title={type ? type.name : "New collection type"} sub="Content model and entries"><Link className="btn btn-ghost" href="/cms/collections/">← Collection types</Link>{type && <Link className="btn btn-primary" href={`/cms/collections/${type.id}/entries/new/`}>New entry</Link>}</Head>
    {sp.saved && <div className="notice ok" style={{ display: "block" }}>Saved.</div>}
    {sp.deleted && <div className="notice ok" style={{ display: "block" }}>Deleted.</div>}
    {sp.error && <div className="notice err" style={{ display: "block" }}>{sp.error === "related" ? "This item is referenced by another collection. Remove that relationship before deleting it." : "This collection still has entries or is used on a page."}</div>}
    <section className="a-card"><ActionForm action={saveCmsCollection} submit="Save collection type" className="form a-form3" hidden={{ id: type?.id || "" }} fields={[
      { name: "name", label: "Collection name", required: true, defaultValue: type?.name, full: true },
      { name: "slug", label: "Key", required: true, defaultValue: type?.slug, hint: "Lowercase letters, numbers and hyphens." },
    ]}><CmsFieldsBuilder initial={type ? JSON.parse(type.fields) : [{ key: "title", label: "Title", type: "text", required: true }]} collections={collections} /></ActionForm></section>
    {type && <section className="a-card" style={{ marginTop: 20 }}><h2>Entries ({entries.length})</h2>
      <form method="get" className="a-inline" style={{ marginBottom: 18 }}><input className="input" name="q" defaultValue={q} placeholder="Search entries" aria-label="Search entries" />
        <select className="input" name="status" aria-label="Filter by status" defaultValue={status}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select>
        <select className="input" name="sort" aria-label="Sort entries" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select>
        <button className="btn btn-ghost btn-sm">Apply</button><Link href={`/cms/collections/${type.id}/`}>Reset</Link></form>
      <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Entry</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>
      {entries.map((entry) => <tr key={entry.id}><td>{String(JSON.parse(entry.data)[firstKey] || `Entry ${entry.id}`)}</td><td>{entry.status}{entry.published_data && entry.published_data !== entry.data ? " · Draft changes" : ""}</td><td>{new Date(entry.updated_at).toLocaleString("en-GB")}</td><td><Link href={`/cms/collections/${type.id}/entries/${entry.id}/`}>Edit</Link><form action={deleteCmsEntry}><input type="hidden" name="type_id" value={type.id} /><input type="hidden" name="id" value={entry.id} /><ConfirmButton className="btn btn-ghost btn-sm" message="Delete this entry permanently?">Delete</ConfirmButton></form></td></tr>)}
      {!entries.length && <tr><td colSpan="4">{allEntries.length ? "No entries match these filters." : "No entries yet."}</td></tr>}
    </tbody></table></div>{!allEntries.length && <form action={deleteEmptyCmsCollection} style={{ marginTop: 18 }}><input type="hidden" name="id" value={type.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={`Delete empty collection ${type.name}?`}>Delete collection type</ConfirmButton></form>}</section>}
  </>;
}
