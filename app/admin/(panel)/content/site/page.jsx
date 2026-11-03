import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import CmsSiteEditor from "@/components/admin/CmsSiteEditor";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { siteContent } from "@/lib/cms-site";
import { saveSiteContent, restoreSiteContent } from "@/lib/cms-actions";
import { db } from "@/lib/db";

export default async function SiteContent({ searchParams }) {
  await requirePerm("content");
  const site = siteContent();
  const revisions = db.prepare("SELECT id, created_at FROM cms_site_revisions ORDER BY id DESC LIMIT 10").all();
  return <><Head title="Site content" sub="Manage company details, membership text, banners, artists and gallery."><Link className="btn btn-ghost" href="/admin/content/">← Content</Link></Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Site content saved.</div>}
    {(await searchParams).restored && <div className="notice ok" style={{ display: "block" }}>Site content restored.</div>}
    <ActionForm action={saveSiteContent} submit="Save site content" className="form a-form3" fields={[]}><CmsSiteEditor initial={site} /></ActionForm>
    {!!revisions.length && <section className="a-card" style={{ marginTop: 20 }}><h2>Revision history</h2><ul className="a-hist">{revisions.map((r) => <li key={r.id}>{new Date(r.created_at).toLocaleString("en-GB")}<form action={restoreSiteContent}><input type="hidden" name="revision_id" value={r.id} /><button className="btn btn-ghost btn-sm">Restore</button></form></li>)}</ul></section>}
  </>;
}
