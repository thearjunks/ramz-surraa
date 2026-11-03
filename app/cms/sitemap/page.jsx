import Link from "next/link";
import { Head } from "@/components/admin/ui";
import WebsitePageTree, { DirectoryFilters } from "@/components/admin/WebsitePageTree";
import { can, requirePerm } from "@/lib/auth";

export default async function CmsSitemap({ searchParams }) {
  const user = await requirePerm("content");
  const sp = await searchParams || {};
  const term = String(sp.q || "").trim();
  const status = String(sp.status || "").toLowerCase();
  const sort = sp.sort === "title" ? "title" : "website";
  return <><Head title="Sitemap" sub="Explore page relationships and publication status.">
    <a className="btn btn-ghost" href="/sitemap.xml" target="_blank" rel="noreferrer">View XML sitemap ↗</a></Head>
    <DirectoryFilters term={term} status={status} sort={sort} action="/cms/sitemap/" />
    <section className="a-card"><h2>Website hierarchy</h2>
      <WebsitePageTree term={term} status={status} sort={sort} events canEditEvents={can(user,"events")} />
    </section>
    {!term && !status && <section className="a-card" style={{ marginTop: 18 }}><h2>Protected applications</h2>
      <div className="btn-row"><Link href="/cms/">Content studio</Link><Link href="/admin/">Admin dashboard</Link></div>
    </section>}
  </>;
}
