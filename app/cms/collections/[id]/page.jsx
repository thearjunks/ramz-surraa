import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsFieldsBuilder from "@/components/admin/CmsFieldsBuilder";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { saveCmsCollection } from "@/lib/cms-actions";

export default async function CollectionEditor({ params, searchParams }) {
  await requirePerm("content");
  const id = (await params).id;
  const type = id === "new" ? null : db.prepare("SELECT * FROM cms_collection_types WHERE id=?").get(Number(id));
  if (id !== "new" && !type) notFound();
  const entries = type ? db.prepare("SELECT id,data,status,updated_at FROM cms_collection_entries WHERE type_id=? ORDER BY id DESC LIMIT 100").all(type.id) : [];
  const firstKey = type ? JSON.parse(type.fields)[0]?.key : null;
  return <>
    <Head title={type ? type.name : "New collection type"} sub="Content model and entries"><Link className="btn btn-ghost" href="/cms/collections/">← Collection types</Link>{type && <Link className="btn btn-primary" href={`/cms/collections/${type.id}/entries/new/`}>New entry</Link>}</Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Saved.</div>}
    <section className="a-card"><ActionForm action={saveCmsCollection} submit="Save collection type" className="form a-form3" hidden={{ id: type?.id || "" }} fields={[
      { name: "name", label: "Collection name", required: true, defaultValue: type?.name, full: true },
      { name: "slug", label: "Key", required: true, defaultValue: type?.slug, hint: "Lowercase letters, numbers and hyphens." },
    ]}><CmsFieldsBuilder initial={type ? JSON.parse(type.fields) : [{ key: "title", label: "Title", type: "text", required: true }]} /></ActionForm></section>
    {type && <section className="a-card" style={{ marginTop: 20 }}><h2>Entries</h2><div className="a-table-wrap"><table className="a-table"><thead><tr><th>Entry</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>
      {entries.map((entry) => <tr key={entry.id}><td>{String(JSON.parse(entry.data)[firstKey] || `Entry ${entry.id}`)}</td><td>{entry.status}</td><td>{new Date(entry.updated_at).toLocaleString("en-GB")}</td><td><Link href={`/cms/collections/${type.id}/entries/${entry.id}/`}>Edit</Link></td></tr>)}
      {!entries.length && <tr><td colSpan="4">No entries yet.</td></tr>}
    </tbody></table></div></section>}
  </>;
}
