import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadCmsMedia, deleteCmsMedia } from "@/lib/cms-actions";

export default async function MediaAdmin({ searchParams }) {
  await requirePerm("content");
  const media = db.prepare("SELECT * FROM cms_media ORDER BY id DESC LIMIT 100").all();
  return <><Head title="Media" sub="Upload images and documents to use in page sections."><Link className="btn btn-ghost" href="/admin/content/">← Content</Link></Head>
    {(await searchParams).uploaded && <div className="notice ok" style={{ display: "block" }}>Media uploaded.</div>}
    {(await searchParams).deleted && <div className="notice ok" style={{ display: "block" }}>Media deleted.</div>}
    {(await searchParams).error === "inuse" && <div className="notice err" style={{ display: "block" }}>This file is used by a page, site content, or event. Replace those references first.</div>}
    <section className="a-card"><ActionForm action={uploadCmsMedia} submit="Upload media" className="form a-form3" fields={[
      { name: "alt_text", label: "Image description", required: true, full: true },
    ]}><label className="field full">File<input className="input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></label></ActionForm></section>
    <div className="a-table-wrap" style={{ marginTop: 18 }}><table className="a-table"><thead><tr><th>Preview</th><th>File</th><th>URL to copy into a section</th><th>Description</th><th></th></tr></thead><tbody>
      {media.map((m) => <tr key={m.id}><td>{m.mime.startsWith("image/") && <img src={m.url} alt={m.alt_text} width="80" />}</td><td>{m.filename}</td><td><code>{m.url}</code></td><td>{m.alt_text}</td><td><form action={deleteCmsMedia}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost btn-sm">Delete</button></form></td></tr>)}
    </tbody></table></div>
  </>;
}
