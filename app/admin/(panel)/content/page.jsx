import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { setCmsPageStatus, duplicateCmsPage, archiveCmsPage, deleteCmsPage } from "@/lib/cms-actions";
import { ConfirmButton } from "@/components/admin/Client";
import { SITE_ROUTES } from "@/lib/cms";

export default async function ContentPages({ cms = false }) {
  await requirePerm("content");
  const base = cms ? "/cms/" : "/admin/content/";
  const pages = db.prepare("SELECT id, slug, title, status, updated_at FROM cms_pages ORDER BY updated_at DESC").all();
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  return <>
    <Head title="Pages" sub="Create, preview and publish website pages."><Link className="btn btn-primary" href={cms ? "/cms/pages/new/" : "/admin/content/new/"}>New page</Link></Head>
    <section className="a-card" style={{ marginBottom: 20 }}><h2>Website pages</h2><p className="muted">The live site includes these built-in pages. Site content and event data are managed in their existing editors; custom CMS pages appear below.</p>
      <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Page</th><th>URL</th><th>Content source</th><th>Actions</th></tr></thead><tbody>
        {SITE_ROUTES.map(([title, route, slug]) => <tr key={route}><td>{title}</td><td><a href={route} target="_blank" rel="noreferrer">{route}</a></td><td>{slug === "home" ? "Homepage tree" : bySlug[slug]?.status === "published" ? "CMS page" : "Site template + CMS blocks"}</td><td><Link href={slug === "home" ? "/cms/home/" : `/cms/routes/${slug}/`}>{slug === "home" ? "Edit homepage" : "Edit blocks"}</Link>{bySlug[slug] && <> · <Link href={`/cms/pages/${bySlug[slug].id}/`}>Edit CMS page</Link></>}</td></tr>)}
        <tr><td>Admin dashboard</td><td><a href="/admin/" target="_blank" rel="noreferrer">/admin/</a></td><td>Protected application</td><td>Managed in Admin</td></tr>
      </tbody></table></div>
    </section>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>CMS page</th><th>URL</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {pages.map((p) => <tr key={p.id}><td>{p.title}</td><td className="mono">/{p.slug}/</td><td>{p.status}</td><td>{new Date(p.updated_at).toLocaleString("en-GB")}</td><td className="nowrap">
        <Link className="btn btn-ghost btn-sm" href={cms ? `/cms/pages/${p.id}/` : `/admin/content/${p.id}/`}>Edit</Link>{" "}
        <Link className="btn btn-ghost btn-sm" href={`/cms/preview/${p.slug}/`} target="_blank">Preview</Link>{" "}
        <form action={duplicateCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Duplicate</button></form>{" "}
        <form action={setCmsPageStatus} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="status" value={p.status === "draft" ? "published" : "draft"} /><button className="btn btn-ghost btn-sm">{p.status === "published" ? "Unpublish" : p.status === "archived" ? "Restore draft" : "Publish"}</button></form>{" "}
        {p.status !== "archived" ? <form action={archiveCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Archive</button></form>
          : <form action={deleteCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><ConfirmButton className="btn btn-ghost btn-sm" message={`Permanently delete ${p.title} and its revision history?`}>Delete</ConfirmButton></form>}
      </td></tr>)}
      {!pages.length && <tr><td colSpan="5">No CMS pages yet.</td></tr>}
    </tbody></table></div>
  </>;
}
