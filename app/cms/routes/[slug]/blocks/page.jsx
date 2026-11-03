import { sectionCatalog } from "@/lib/section-catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsSections from "@/components/admin/CmsSections";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { ROUTE_TREE_SLUGS } from "@/lib/route-tree";
import { saveCmsRoute, unpublishCmsBlocks, restoreCmsBlocks } from "@/lib/cms-actions";

export default async function RouteBlocks({ params, searchParams }) {
  await requirePerm("content");
  const slug = (await params).slug;
  if (slug !== "home" && !ROUTE_TREE_SLUGS.includes(slug)) notFound();
  const saved = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(slug);
  const revisions = db.prepare("SELECT id,status,created_at FROM cms_route_revisions WHERE slug=? ORDER BY id DESC LIMIT 10").all(slug);
  const media = db.prepare("SELECT url,alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 200").all().map((r) => ({ url: r.url, alt_text: r.alt_text }));
  const components = db.prepare("SELECT id,name FROM cms_components ORDER BY name").all().map((r) => ({ id: r.id, name: r.name }));
  const collections = db.prepare("SELECT id,name FROM cms_collection_types ORDER BY name").all().map((r) => ({ id: r.id, name: r.name }));
  return <><Head title="Additional CMS blocks" sub="Reusable components and collection blocks displayed after the page tree.">
    <Link className="btn btn-ghost" href={slug === "home" ? "/cms/home/" : `/cms/routes/${slug}/`}>← Page tree</Link>
    <Link className="btn btn-ghost" href={slug === "home" ? "/home-preview/" : `/route-preview/${slug}/`} target="_blank">Preview saved draft ↗</Link></Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Blocks saved.</div>}
    <section className="a-card"><ActionForm action={saveCmsRoute} submit="Save blocks" className="form a-form3" hidden={{ slug, blocks: "1" }} fields={[
      { name: "status", label: "Save as", type: "select", noEmpty: true, options: [["draft", "Private draft"], ["published", "Publish to website"]], defaultValue: "draft" },
    ]}><CmsSections sources={sectionCatalog()} initial={saved ? JSON.parse(saved.draft_sections ?? saved.sections) : []} media={media} components={components} collections={collections} cms /></ActionForm></section>
    {saved && <section className="a-card" style={{ marginTop: 18 }}><p>Current status: {saved.status}{saved.draft_sections && " · Unpublished draft changes"}</p>
      {saved.status === "published" && <form action={unpublishCmsBlocks}><input type="hidden" name="slug" value={slug} /><button className="btn btn-ghost btn-sm">Unpublish blocks</button></form>}</section>}
    {!!revisions.length && <section className="a-card" style={{ marginTop: 18 }}><h2>Revisions</h2><ul>{revisions.map((row) => <li key={row.id}>{new Date(row.created_at).toLocaleString("en-GB")} · {row.status} <form action={restoreCmsBlocks} style={{ display: "inline" }}><input type="hidden" name="id" value={row.id} /><button className="btn btn-ghost btn-sm">Restore to draft</button></form></li>)}</ul></section>}
  </>;
}
