import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { saveCmsEntry, unpublishCmsEntry } from "@/lib/collection-actions";
import CmsEntryFields from "@/components/admin/CmsEntryFields";

export default async function CollectionEntryEditor({ params }) {
  await requirePerm("content");
  const { id, entryId } = await params;
  const type = db.prepare("SELECT * FROM cms_collection_types WHERE id=?").get(Number(id));
  if (!type) notFound();
  const entry = entryId === "new" ? null : db.prepare("SELECT * FROM cms_collection_entries WHERE id=? AND type_id=?").get(Number(entryId), type.id);
  if (entryId !== "new" && !entry) notFound();
  const data = entry ? JSON.parse(entry.data) : {};
  const fields = JSON.parse(type.fields).map((field) => {
    if (field.type !== "relation") return field;
    const relatedType = db.prepare("SELECT fields FROM cms_collection_types WHERE id=?").get(Number(field.collectionId));
    const titleKey = relatedType ? JSON.parse(relatedType.fields).find((f) => ["text", "richtext"].includes(f.type))?.key : null;
    const related = db.prepare("SELECT id,data,status FROM cms_collection_entries WHERE type_id=? ORDER BY id DESC LIMIT 1000").all(Number(field.collectionId));
    return { ...field, options: related.map((e) => [String(e.id), `${String(JSON.parse(e.data)[titleKey] || `Entry ${e.id}`).slice(0, 120)}${e.status === "draft" ? " (draft)" : ""}`]) };
  });
  const media = db.prepare("SELECT url,filename,mime,alt_text FROM cms_media ORDER BY id DESC LIMIT 1000").all()
    .map((m) => ({ url: m.url, filename: m.filename, mime: m.mime, alt_text: m.alt_text }));
  return <>
    <Head title={entry ? `Edit ${type.name} entry` : `New ${type.name} entry`} sub="Save a draft privately, or publish the current values."><Link className="btn btn-ghost" href={`/cms/collections/${type.id}/`}>← {type.name}</Link><Link className="btn btn-ghost" href="/cms/media/" target="_blank">Media library ↗</Link></Head>
    <section className="a-card"><ActionForm action={saveCmsEntry} submit="Save entry" className="form a-form3" hidden={{ type_id: type.id, id: entry?.id || "" }} fields={[
      { name: "status", label: "Save action", type: "select", noEmpty: true, options: [["draft", "Save draft"], ["published", "Publish changes"]], defaultValue: "draft" },
    ]}><CmsEntryFields fields={fields} initial={data} media={media} /></ActionForm></section>
    {entry && <div className="a-card btn-row"><Link className="btn btn-ghost" href={`/cms/collections/${type.id}/entries/${entry.id}/preview/`} target="_blank">Preview saved entry ↗</Link>
      {entry.status === "published" && <form action={unpublishCmsEntry}><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="type_id" value={type.id}/><button className="btn btn-ghost">Unpublish entry</button></form>}</div>}
  </>;
}
