import Link from "next/link";
import { Head, Stat } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { SITE_ROUTES, navigationItems } from "@/lib/cms";
import { defaultHome } from "@/lib/home-cms";
import { defaultRouteTree, ROUTE_TREE_SLUGS } from "@/lib/route-tree";

export const dynamic = "force-dynamic";

export default async function CmsHome() {
  await requirePerm("content");
  const pages = db.prepare("SELECT status, COUNT(*) count FROM cms_pages GROUP BY status").all();
  const count = Object.fromEntries(pages.map((row) => [row.status, row.count]));
  const media = db.prepare("SELECT COUNT(*) total, SUM(mime LIKE 'image/%') images FROM cms_media").get();
  const navCount = navigationItems().length;
  const changedTrees = db.prepare("SELECT COUNT(*) AS n FROM (SELECT draft,published FROM cms_route_trees UNION ALL SELECT draft,published FROM cms_home) WHERE draft IS NOT NULL AND draft!=published").get().n;
  const changedPages = db.prepare("SELECT COUNT(*) AS n FROM cms_pages WHERE status='published' AND draft_content IS NOT NULL").get().n;
  const components = db.prepare("SELECT COUNT(*) total FROM cms_components").get();
  const collections = db.prepare("SELECT COUNT(*) total FROM cms_collection_types").get();
  const recent = db.prepare("SELECT id, title, slug, status, updated_at FROM cms_pages ORDER BY updated_at DESC LIMIT 8").all();
  const builtInSections = defaultHome().length + ROUTE_TREE_SLUGS.reduce((sum, slug) => sum + defaultRouteTree(slug).length, 0);
  return <>
    <Head title="Content studio" sub="Manage the content published on surraa.com.">
      <Link className="btn btn-primary" href="/cms/pages/new/">New page</Link>
    </Head>
    <div className="a-stats">
      <Stat label="Pages" value={SITE_ROUTES.length + Object.values(count).reduce((sum, n) => sum + n, 0)} href="/cms/pages/" />
      <Stat label="Published" value={SITE_ROUTES.length + (count.published || 0)} href="/cms/pages/" tone="up" />
      <Stat label="Drafts" value={(count.draft || 0) + changedPages + changedTrees} href="/cms/pages/" />
      <Stat label="Media assets" value={media.total} hint={`${media.images || 0} images`} href="/cms/media/" />
      <Stat label="Navigation links" value={navCount} href="/cms/navigation/" />
      <Stat label="Sections & components" value={builtInSections + components.total} href="/cms/components/" />
      <Stat label="Collection types" value={3 + collections.total} href="/cms/collections/" />
    </div>
    <section className="a-card" style={{ marginTop: 20 }}>
      <h2>Recently updated pages</h2>
      {recent.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Page</th><th>URL</th><th>Status</th><th>Updated</th></tr></thead><tbody>
        {recent.map((page) => <tr key={page.id}><td><Link href={`/cms/pages/${page.id}/`}>{page.title}</Link></td><td>/{page.slug}/</td><td>{page.status}</td><td>{new Date(page.updated_at).toLocaleString("en-GB")}</td></tr>)}
      </tbody></table></div> : <p>The live website pages are ready to edit in <Link href="/cms/pages/">Pages</Link>. No custom pages have been created yet.</p>}
    </section>
  </>;
}
