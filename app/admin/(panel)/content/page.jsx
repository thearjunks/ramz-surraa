import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { setCmsPageStatus, duplicateCmsPage, archiveCmsPage, deleteCmsPage } from "@/lib/cms-actions";
import { ConfirmButton } from "@/components/admin/Client";
import WebsitePageTree, { DirectoryFilters } from "@/components/admin/WebsitePageTree";

export default async function ContentPages({ cms = false, searchParams }) {
  await requirePerm("content");
  const base = cms ? "/cms/pages/" : "/admin/content/";
  const sp = await searchParams || {};
  const q = String(sp.q || "").trim().toLowerCase();
  const status = String(sp.status || "").toLowerCase();
  const sort = sp.sort === "title" ? "title" : "website";
  const allPages = db.prepare("SELECT id, slug, title, status, updated_at FROM cms_pages ORDER BY updated_at DESC").all();
  const pages = allPages.filter((p) => (!status || p.status === status) && (!q || `${p.title} ${p.slug} ${p.status}`.toLowerCase().includes(q)));
  if (sort === "title") pages.sort((a,b) => a.title.localeCompare(b.title));
  return <>
    <Head title="Pages" sub="Create, preview and publish website pages."><Link className="btn btn-primary" href={cms ? "/cms/pages/new/" : "/admin/content/new/"}>New page</Link></Head>
    <DirectoryFilters term={q} status={status} sort={sort} action={base} />
    <section className="a-card" style={{ marginBottom: 20 }}><h2>Website pages</h2>
      <WebsitePageTree term={q} status={status} sort={sort} />
    </section>
    {!q && !status && <section className="a-card" style={{ marginBottom: 20 }}><h2>Protected application</h2><Link href="/admin/">Admin dashboard</Link></section>}
    <h2>Custom page actions</h2>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>CMS page</th><th>URL</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {pages.map((p) => <tr key={p.id}><td>{p.title}</td><td className="mono">/{p.slug}/</td><td>{p.status}</td><td>{new Date(p.updated_at).toLocaleString("en-GB")}</td><td className="nowrap">
        <Link className="btn btn-ghost btn-sm" href={cms ? `/cms/pages/${p.id}/` : `/admin/content/${p.id}/`}>Edit</Link>{" "}
        <Link className="btn btn-ghost btn-sm" href={`/cms/preview/${p.slug}/`} target="_blank">Preview</Link>{" "}
        <form action={duplicateCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Duplicate</button></form>{" "}
        <form action={setCmsPageStatus} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="status" value={p.status === "draft" ? "published" : "draft"} /><button className="btn btn-ghost btn-sm">{p.status === "published" ? "Unpublish" : p.status === "archived" ? "Restore draft" : "Publish"}</button></form>{" "}
        {p.status !== "archived" ? <form action={archiveCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Archive</button></form>
          : <form action={deleteCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><ConfirmButton className="btn btn-ghost btn-sm" message={`Permanently delete ${p.title} and its revision history?`}>Delete</ConfirmButton></form>}
      </td></tr>)}
      {!pages.length && <tr><td colSpan="5">{q || status ? "No custom pages match your filters." : "No custom pages yet."}</td></tr>}
    </tbody></table></div>
  </>;
}
