import { sectionCatalog } from "@/lib/section-catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsSections from "@/components/admin/CmsSections";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { saveCmsComponent, unpublishCmsComponent } from "@/lib/cms-actions";

export default async function ComponentEditor({ params }) {
  await requirePerm("content");
  const id = (await params).id;
  const component = id === "new" ? null : db.prepare("SELECT * FROM cms_components WHERE id = ?").get(Number(id));
  if (id !== "new" && !component) notFound();
  const media = db.prepare("SELECT url, alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 100").all().map((r) => ({ url: r.url, alt_text: r.alt_text }));
  const collections = db.prepare("SELECT id, name FROM cms_collection_types ORDER BY name").all().map((r) => ({ id: r.id, name: r.name }));
  return <>
    <Head title={component ? component.name : "New component"} sub="A shared section can be placed on multiple pages."><Link className="btn btn-ghost" href="/cms/components/">← Components</Link></Head>
    <section className="a-card"><ActionForm action={saveCmsComponent} submit="Save component" className="form a-form3" hidden={{ id: component?.id || "" }} fields={[{ name: "name", label: "Component name", required: true, defaultValue: component?.name, full: true },
      { name: "status", label: "Save as", type: "select", noEmpty: true, options: [["draft", "Save draft"], ["published", "Publish"]], defaultValue: "draft" }]}>
      <CmsSections sources={sectionCatalog()} initial={component ? [JSON.parse(component.section)] : [{ type: "text", heading: "", body: "", visible: true }]} media={media} collections={collections} cms />
    </ActionForm></section>
    {component && <div className="btn-row" style={{ marginTop: 18 }}><Link className="btn btn-ghost" href={`/cms/components/${component.id}/preview/`} target="_blank">Preview saved draft</Link>
      {component.status === "published" && <form action={unpublishCmsComponent}><input type="hidden" name="id" value={component.id} /><button className="btn btn-ghost">Unpublish component</button></form>}</div>}
  </>;
}
