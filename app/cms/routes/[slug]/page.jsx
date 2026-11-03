import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Head } from "@/components/admin/ui";
import RouteTreeEditor from "@/components/admin/RouteTreeEditor";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { SITE_ROUTES } from "@/lib/cms";
import { ROUTE_TREE_SLUGS, routeTreeVersions } from "@/lib/route-tree";

export default async function RouteEditor({ params, searchParams }) {
  await requirePerm("content");
  const slug = (await params).slug;
  if (slug === "home") redirect("/cms/home/");
  if (!ROUTE_TREE_SLUGS.includes(slug)) notFound();
  const route = SITE_ROUTES.find((item) => item[2] === slug);
  const versions = routeTreeVersions(slug);
  const override = db.prepare("SELECT id FROM cms_pages WHERE slug=? AND status='published'").get(slug);
  const sp = await searchParams;
  const media = db.prepare("SELECT url,alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 200").all()
    .map((row) => ({ url: row.url, alt_text: row.alt_text }));
  const revisions = db.prepare("SELECT created_at FROM cms_route_tree_revisions WHERE slug=? ORDER BY id DESC LIMIT 8").all(slug);
  return <>
    <Head title={route[0]} sub={`Edit the sections of ${route[1]}`}>
      <Link className="btn btn-ghost" href="/cms/pages/">← Pages</Link>
      <Link className="btn btn-ghost" href={`/route-preview/${slug}/`} target="_blank">Preview saved draft ↗</Link>
      <Link className="btn btn-ghost" href={`/cms/routes/${slug}/blocks/`}>Additional CMS blocks</Link>
      <a className="btn btn-ghost" href={route[1]} target="_blank" rel="noreferrer">View live ↗</a>
    </Head>
    {sp.saved && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Draft saved. The live page is unchanged.</div>}
    {sp.published && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Page published.</div>}
    {sp.section_published && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Section published. Other draft changes remain private.</div>}
    {sp.error && <div className="notice err" style={{ display: "block", marginBottom: 14 }}>Invalid page content.</div>}
    {override && <div className="notice err" style={{ display: "block", marginBottom: 14 }}>A separately published CMS page currently overrides this page tree. <Link href={`/cms/pages/${override.id}/`}>Open that page</Link> to manage the live content.</div>}
    <div className="a-card" style={{ marginBottom: 18 }}><b>Live version</b>: {versions.publishedAt ? new Date(versions.publishedAt).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" }) : "Current website content"}
      <br /><b>Saved draft</b>: {versions.draftAt ? new Date(versions.draftAt).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" }) : "Not saved yet"}</div>
    <RouteTreeEditor slug={slug} initial={versions.draft} published={versions.published} media={media} />
    {!!revisions.length && <section className="a-card" style={{ marginTop: 20 }}><h2>Previous published versions</h2><ul className="a-hist">{revisions.map((r, i) => <li key={i}>{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })}</li>)}</ul></section>}
  </>;
}
