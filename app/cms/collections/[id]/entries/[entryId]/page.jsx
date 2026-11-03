import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { saveCmsEntry } from "@/lib/cms-actions";

export default async function CollectionEntryEditor({ params }) {
  await requirePerm("content");
  const { id, entryId } = await params;
  const type = db.prepare("SELECT * FROM cms_collection_types WHERE id=?").get(Number(id));
  if (!type) notFound();
  const entry = entryId === "new" ? null : db.prepare("SELECT * FROM cms_collection_entries WHERE id=? AND type_id=?").get(Number(entryId), type.id);
  if (entryId !== "new" && !entry) notFound();
  const data = entry ? JSON.parse(entry.data) : {};
  const fields = JSON.parse(type.fields).map((field) => ({
    name: `field_${field.key}`, label: field.label, required: field.required,
    type: field.type === "richtext" ? "textarea" : field.type === "boolean" ? "checkbox" : field.type === "media" ? "text" : field.type,
    defaultValue: data[field.key], full: field.type === "richtext", hint: field.type === "media" ? "Choose a URL from the Media library." : undefined,
  }));
  return <>
    <Head title={entry ? `Edit ${type.name} entry` : `New ${type.name} entry`} sub="Save as draft or publish."><Link className="btn btn-ghost" href={`/cms/collections/${type.id}/`}>← {type.name}</Link><Link className="btn btn-ghost" href="/cms/media/" target="_blank">Media library ↗</Link></Head>
    <section className="a-card"><ActionForm action={saveCmsEntry} submit="Save entry" className="form a-form3" hidden={{ type_id: type.id, id: entry?.id || "" }} fields={[
      ...fields,
      { name: "status", label: "Status", type: "select", noEmpty: true, options: [["draft", "Draft"], ["published", "Published"]], defaultValue: entry?.status || "draft" },
    ]} /></section>
  </>;
}
