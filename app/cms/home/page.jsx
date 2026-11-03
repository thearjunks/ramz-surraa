import Link from "next/link";
import { Head } from "@/components/admin/ui";
import HomeTreeEditor from "@/components/admin/HomeTreeEditor";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { homeVersions } from "@/lib/home-cms";

export default async function HomeEditor({ searchParams }) {
  await requirePerm("content");
  const versions = homeVersions();
  const media = db.prepare("SELECT url, alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 200").all()
    .map((row) => ({ url: row.url, alt_text: row.alt_text }));
  const revisions = db.prepare("SELECT created_at FROM cms_home_revisions ORDER BY id DESC LIMIT 8").all();
  const sp = await searchParams;
  return <>
    <Head title="Home page" sub="Edit and reorder the five sections of the live homepage.">
      <Link className="btn btn-ghost" href="/cms/pages/">← Pages</Link>
      <Link className="btn btn-ghost" href="/home-preview/" target="_blank">Preview saved draft ↗</Link>
      <Link className="btn btn-ghost" href="/cms/routes/home/blocks/">Additional CMS blocks</Link>
      <a className="btn btn-ghost" href="/" target="_blank" rel="noreferrer">View live ↗</a>
    </Head>
    {sp.saved && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Draft saved. The live homepage is unchanged.</div>}
    {sp.published && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Homepage published.</div>}
    {sp.section_published && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Section published. Other draft changes remain private.</div>}
    {sp.error && <div className="notice err" style={{ display: "block", marginBottom: 14 }}>The homepage data was invalid. Check the fields and links.</div>}
    <div className="a-card" style={{ marginBottom: 18 }}><b>Live version</b>: {versions.publishedAt ? new Date(versions.publishedAt).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" }) : "Current website content"}
      <br /><b>Saved draft</b>: {versions.draftAt ? new Date(versions.draftAt).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" }) : "Not saved yet"}</div>
    <HomeTreeEditor initial={versions.draft} published={versions.published} media={media} hasDraft={JSON.stringify(versions.draft) !== JSON.stringify(versions.published)} />
    {!!revisions.length && <section className="a-card" style={{ marginTop: 20 }}><h2>Previous published versions</h2><ul className="a-hist">{revisions.map((row, index) => <li key={index}>{new Date(row.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })}</li>)}</ul></section>}
  </>;
}
