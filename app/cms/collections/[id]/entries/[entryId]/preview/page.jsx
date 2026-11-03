import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { Head } from "@/components/admin/ui";
import { validCmsHref } from "@/lib/cms";

export default async function EntryPreview({ params }) {
  await requirePerm("content");
  const {id, entryId} = await params;
  const row = db.prepare("SELECT e.data,t.fields,t.name FROM cms_collection_entries e JOIN cms_collection_types t ON t.id=e.type_id WHERE e.id=? AND t.id=?").get(Number(entryId), Number(id));
  if (!row) notFound();
  const data = JSON.parse(row.data);
  return <><Head title={row.name} sub="Private preview of this saved entry"><Link className="btn btn-ghost" href={`/cms/collections/${id}/entries/${entryId}/`}>Back to editor</Link></Head>
    <section className="a-card"><dl>{JSON.parse(row.fields).map((field) => {
      let value = data[field.key];
      if (field.type === "relation" && value) {
        const related = db.prepare("SELECT e.data,t.fields FROM cms_collection_entries e JOIN cms_collection_types t ON t.id=e.type_id WHERE e.id=? AND t.id=?").get(Number(value),Number(field.collectionId));
        if (related) value = JSON.parse(related.data)[JSON.parse(related.fields).find((f)=>f.type==="text")?.key] || `Entry ${value}`;
      }
      return <div key={field.key}><dt><b>{field.label}</b></dt><dd style={{whiteSpace:"pre-line"}}>{field.type==="boolean" ? (value ? "Yes":"No") : field.type === "media" && typeof value==="string" && validCmsHref(value) ? <a href={value} target="_blank" rel="noreferrer">Open media ↗</a> : String(value ?? "—")}</dd></div>;
    })}</dl></section></>;
}
