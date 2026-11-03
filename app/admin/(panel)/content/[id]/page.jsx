import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsSections from "@/components/admin/CmsSections";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveCmsPage, restoreCmsRevision } from "@/lib/cms-actions";

export default async function ContentEdit({ params, searchParams, cms = false }) {
  await requirePerm("content");
  const id = (await params).id;
  const page = id === "new" ? null : db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(Number(id));
  if (id !== "new" && !page) notFound();
  const sections = page ? JSON.parse(page.sections) : [];
  const revisions = page ? db.prepare("SELECT id, created_at FROM cms_revisions WHERE page_id = ? ORDER BY id DESC LIMIT 10").all(page.id) : [];
  const media = db.prepare("SELECT url, alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 100").all();
  return <>
    <Head title={page ? `Edit ${page.title}` : "New page"} sub="Edit, preview and publish reusable page sections."><Link className="btn btn-ghost" href={cms ? "/cms/" : "/admin/content/"}>← Pages</Link><Link className="btn btn-ghost" href={cms ? "/cms/media/" : "/admin/content/media/"}>Upload images</Link>{page && <Link className="btn btn-ghost" href={`/cms/preview/${page.slug}/`} target="_blank">Preview ↗</Link>}</Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Page saved.</div>}
    {(await searchParams).restored && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Revision restored.</div>}
    <section className="a-card"><ActionForm action={saveCmsPage} submit="Save page" className="form a-form3" hidden={{ id: page?.id || "", cms: cms ? "1" : "0" }} fields={[
      { name: "title", label: "Page title", required: true, defaultValue: page?.title, full: true },
      { name: "slug", label: "Page URL", required: true, defaultValue: page?.slug, placeholder: "our-story", hint: "Lowercase letters, numbers and hyphens. Example: our-story → /our-story/" },
      { name: "status", label: "Status", type: "select", noEmpty: true, options: [["draft", "Draft"], ["published", "Published"]], defaultValue: page?.status || "draft" },
      { name: "description", label: "SEO description", type: "textarea", defaultValue: page?.description, full: true },
      { name: "keywords", label: "SEO keywords", defaultValue: page?.keywords, full: true },
      { name: "canonical_url", label: "Canonical URL", defaultValue: page?.canonical_url, full: true },
      { name: "og_image", label: "Social sharing image URL", defaultValue: page?.og_image, full: true },
    ]}><CmsSections initial={sections} media={media} cms={cms} /></ActionForm></section>
    {!!revisions.length && <section className="a-card" style={{ marginTop: 18 }}><h2>Revision history</h2><ul className="a-hist">{revisions.map((r) => <li key={r.id}><span>{new Date(r.created_at).toLocaleString("en-GB")}</span><form action={restoreCmsRevision}><input type="hidden" name="revision_id" value={r.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Restore</button></form></li>)}</ul></section>}
  </>;
}
