import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { setCmsPageStatus, duplicateCmsPage, archiveCmsPage, deleteCmsPage } from "@/lib/cms-actions";
import { ConfirmButton } from "@/components/admin/Client";

export default async function ContentPages({ cms = false }) {
  await requirePerm("content");
  const base = cms ? "/cms/" : "/admin/content/";
  const pages = db.prepare("SELECT id, slug, title, status, updated_at FROM cms_pages ORDER BY updated_at DESC").all();
  return <>
    <Head title="Pages" sub="Create, preview and publish website pages."><Link className="btn btn-ghost" href={`${base}site/`}>Site content</Link><Link className="btn btn-ghost" href={`${base}media/`}>Media library</Link><Link className="btn btn-ghost" href={`${base}navigation/`}>Navigation</Link><Link className="btn btn-primary" href={cms ? "/cms/pages/new/" : "/admin/content/new/"}>New page</Link></Head>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Page</th><th>URL</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
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
