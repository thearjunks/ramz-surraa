import Link from "next/link";
import { notFound } from "next/navigation";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { globalContent } from "@/lib/global-content";
import { saveGlobalContent } from "@/lib/global-actions";
import { db } from "@/lib/db";

export default async function GlobalEditor({ params, searchParams }) {
  await requirePerm("content");
  const kind = (await params).kind;
  if (!["header", "footer"].includes(kind)) notFound();
  const data = globalContent(kind, true), sp = await searchParams;
  const images = db.prepare("SELECT url,filename FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 200").all();
  return <><Head title={kind === "header" ? "Website header" : "Website footer"} sub="Global content shown on every public page.">
    <Link className="btn btn-ghost" href="/cms/site/">← Site content</Link><Link className="btn btn-ghost" href="/cms/navigation/">Edit links</Link><Link className="btn btn-ghost" href={`/global-preview/${kind}/`} target="_blank">Preview saved draft</Link></Head>
    {sp.saved && <div className="notice ok" style={{ display: "block" }}>Draft saved. Live content is unchanged.</div>}
    {sp.published && <div className="notice ok" style={{ display: "block" }}>Published on all pages.</div>}
    {sp.error && <div className="notice err" style={{ display: "block" }}>Check the image URL and text.</div>}
    <form action={saveGlobalContent} className="a-card form a-form3"><input type="hidden" name="kind" value={kind} />
      <label className="field full">Logo URL<input className="input" name="logo" defaultValue={data.logo} required list="cms-global-images" /></label>
      <datalist id="cms-global-images">{images.map((image) => <option key={image.url} value={image.url}>{image.filename}</option>)}</datalist>
      <p className="muted full"><Link href="/cms/media/">Upload or choose an image from Media Library</Link></p>
      {kind === "header" ? <label className="field full">Brand label<input className="input" name="label" defaultValue={data.label} /></label>
        : <><label className="field">Links heading<input className="input" name="heading" defaultValue={data.heading} /></label>
          <label className="field full">Description<textarea className="input" name="description" defaultValue={data.description} rows="4" /></label>
          <label className="field full">Copyright line<input className="input" name="copyright" defaultValue={data.copyright} /></label></>}
      <div className="btn-row full"><button className="btn btn-ghost" name="intent" value="draft">Save draft</button><button className="btn btn-primary" name="intent" value="publish">Publish {kind}</button></div>
    </form></>;
}
