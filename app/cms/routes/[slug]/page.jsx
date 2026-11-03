import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import CmsSections from "@/components/admin/CmsSections";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { SITE_ROUTES } from "@/lib/cms";
import { saveCmsRoute } from "@/lib/cms-actions";

export default async function RouteEditor({ params, searchParams }) {
  await requirePerm("content");
  const slug = (await params).slug;
  if (slug === "home") redirect("/cms/home/");
  const route = SITE_ROUTES.find((item) => item[2] === slug);
  if (!route) notFound();
  const saved = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(slug);
  const media = db.prepare("SELECT url, alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 100").all();
  const components = db.prepare("SELECT id, name FROM cms_components ORDER BY name").all();
  const collections = db.prepare("SELECT id, name FROM cms_collection_types ORDER BY name").all();
  const revisions = db.prepare("SELECT created_at, status FROM cms_route_revisions WHERE slug=? ORDER BY id DESC LIMIT 10").all(slug);
  return <>
    <Head title={route[0]} sub={`Additional content for ${route[1]}`}><Link className="btn btn-ghost" href="/cms/pages/">← Pages</Link><a className="btn btn-ghost" href={route[1]} target="_blank" rel="noreferrer">View page ↗</a></Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Page content saved.</div>}
    <p className="muted">The existing page template and its forms stay in place. Published sections appear below it. Drafts are visible here only.</p>
    <section className="a-card"><ActionForm action={saveCmsRoute} submit="Save page content" className="form a-form3" hidden={{ slug }} fields={[
      { name: "status", label: "Content status", type: "select", noEmpty: true, options: [["draft", "Draft"], ["published", "Published"]], defaultValue: saved?.status || "draft" },
    ]}><CmsSections initial={saved ? JSON.parse(saved.sections) : []} media={media} components={components} collections={collections} cms /></ActionForm></section>
    {!!revisions.length && <section className="a-card" style={{ marginTop: 18 }}><h2>Change history</h2><ul className="a-hist">{revisions.map((row, index) => <li key={index}>{new Date(row.created_at).toLocaleString("en-GB")} · {row.status}</li>)}</ul></section>}
  </>;
}
