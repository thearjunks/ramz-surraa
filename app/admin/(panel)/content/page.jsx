import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { setCmsPageStatus, duplicateCmsPage, archiveCmsPage } from "@/lib/cms-actions";

export default async function ContentPages() {
  await requirePerm("content");
  const pages = db.prepare("SELECT id, slug, title, status, updated_at FROM cms_pages ORDER BY updated_at DESC").all();
  return <>
    <Head title="Content" sub="Create and publish website pages."><Link className="btn btn-ghost" href="/admin/content/site/">Site content</Link><Link className="btn btn-ghost" href="/admin/content/media/">Media</Link><Link className="btn btn-ghost" href="/admin/content/navigation/">Navigation</Link><Link className="btn btn-primary" href="/admin/content/new/">New page</Link></Head>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Page</th><th>URL</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {pages.map((p) => <tr key={p.id}><td>{p.title}</td><td className="mono">/{p.slug}/</td><td>{p.status}</td><td>{new Date(p.updated_at).toLocaleString("en-GB")}</td><td className="nowrap">
        <Link className="btn btn-ghost btn-sm" href={`/admin/content/${p.id}/`}>Edit</Link>{" "}
        <Link className="btn btn-ghost btn-sm" href={`/cms/preview/${p.slug}/`} target="_blank">Preview</Link>{" "}
        <form action={duplicateCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">Duplicate</button></form>{" "}
        <form action={setCmsPageStatus} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status === "draft" ? "published" : "draft"} /><button className="btn btn-ghost btn-sm">{p.status === "published" ? "Unpublish" : p.status === "archived" ? "Restore draft" : "Publish"}</button></form>{" "}
        {p.status !== "archived" && <form action={archiveCmsPage} style={{ display: "inline" }}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">Archive</button></form>}
      </td></tr>)}
      {!pages.length && <tr><td colSpan="5">No CMS pages yet.</td></tr>}
    </tbody></table></div>
  </>;
}
