import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import CmsSiteEditor from "@/components/admin/CmsSiteEditor";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { siteContent } from "@/lib/cms-site";
import { saveSiteContent, restoreSiteContent } from "@/lib/cms-actions";
import { db } from "@/lib/db";

export default async function SiteContent({ searchParams, cms = false }) {
  await requirePerm("content");
  const site = siteContent();
  const revisions = db.prepare("SELECT id, created_at FROM cms_site_revisions ORDER BY id DESC LIMIT 10").all();
  const media = db.prepare("SELECT url, alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 100").all();
  return <><Head title="Site content" sub="Manage company details, membership text, banners, artists and gallery."><Link className="btn btn-ghost" href={cms ? "/cms/" : "/admin/content/"}>← Pages</Link><Link className="btn btn-ghost" href={cms ? "/cms/media/" : "/admin/content/media/"}>Upload images</Link></Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Site content saved.</div>}
    {(await searchParams).restored && <div className="notice ok" style={{ display: "block" }}>Site content restored.</div>}
    <ActionForm action={saveSiteContent} submit="Save & publish site content" className="form a-form3" hidden={{ cms: cms ? "1" : "0" }} fields={[]}><CmsSiteEditor initial={site} media={media} cms={cms} /></ActionForm>
    {!!revisions.length && <section className="a-card" style={{ marginTop: 20 }}><h2>Revision history</h2><ul className="a-hist">{revisions.map((r) => <li key={r.id}>{new Date(r.created_at).toLocaleString("en-GB")}<form action={restoreSiteContent}><input type="hidden" name="revision_id" value={r.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Restore</button></form></li>)}</ul></section>}
  </>;
}
