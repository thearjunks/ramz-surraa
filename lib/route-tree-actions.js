"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, now, audit } from "./db";
import { requirePerm } from "./auth";
import { ROUTE_TREE_SLUGS, routeTreeVersions, validateRouteTree } from "./route-tree";
import { SITE_ROUTES } from "./cms";

function parse(fd) {
  const slug = String(fd.get("slug") || "");
  if (!ROUTE_TREE_SLUGS.includes(slug)) return null;
  const raw = String(fd.get("content") || "");
  if (raw.length > 180000) return null;
  try { const nodes = JSON.parse(raw); return validateRouteTree(slug, nodes) ? { slug, nodes } : null; }
  catch { return null; }
}
function target(slug) { return `/cms/routes/${encodeURIComponent(slug)}/`; }
function updateSite(slug) {
  const route = SITE_ROUTES.find((item) => item[2] === slug);
  if (route) revalidatePath(route[1]);
  revalidatePath(target(slug));
}
export async function saveRouteDraft(fd) {
  const user = await requirePerm("content");
  const parsed = parse(fd);
  if (!parsed) redirect("/cms/pages/?error=invalid");
  const { slug, nodes } = parsed, current = routeTreeVersions(slug), at = now();
  db.prepare(`INSERT INTO cms_route_trees (slug,published,draft,draft_at) VALUES (?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET draft=excluded.draft,draft_at=excluded.draft_at`)
    .run(slug, JSON.stringify(current.published), JSON.stringify(nodes), at);
  audit(user.id, "cms.route.draft", "cms_route_trees", slug);
  updateSite(slug);
  redirect(`${target(slug)}?saved=1`);
}
export async function publishRouteTree(fd) {
  const user = await requirePerm("content");
  const parsed = parse(fd);
  if (!parsed) redirect("/cms/pages/?error=invalid");
  const { slug, nodes } = parsed, current = routeTreeVersions(slug), at = now();
  db.transaction(() => {
    db.prepare("INSERT INTO cms_route_tree_revisions (slug,content,by_user,created_at) VALUES (?,?,?,?)")
      .run(slug, JSON.stringify(current.published), user.id, at);
    db.prepare(`INSERT INTO cms_route_trees (slug,published,draft,published_at,draft_at) VALUES (?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET published=excluded.published,draft=excluded.draft,
      published_at=excluded.published_at,draft_at=excluded.draft_at`)
      .run(slug, JSON.stringify(nodes), JSON.stringify(nodes), at, at);
    audit(user.id, "cms.route.publish", "cms_route_trees", slug);
  })();
  updateSite(slug);
  redirect(`${target(slug)}?published=1`);
}
export async function publishRouteSection(sectionId, fd) {
  const user = await requirePerm("content");
  const parsed = parse(fd);
  if (!parsed) redirect("/cms/pages/?error=invalid");
  const { slug, nodes } = parsed, id = String(sectionId || "");
  const selected = nodes.find((n) => n.id === id);
  if (!selected) redirect(`${target(slug)}?error=invalid`);
  const current = routeTreeVersions(slug), at = now();
  const published = current.published.map((n) => n.id === id ? selected : n);
  db.transaction(() => {
    db.prepare("INSERT INTO cms_route_tree_revisions (slug,content,by_user,created_at) VALUES (?,?,?,?)")
      .run(slug, JSON.stringify(current.published), user.id, at);
    db.prepare(`INSERT INTO cms_route_trees (slug,published,draft,published_at,draft_at) VALUES (?,?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET published=excluded.published,draft=excluded.draft,
      published_at=excluded.published_at,draft_at=excluded.draft_at`)
      .run(slug, JSON.stringify(published), JSON.stringify(nodes), at, at);
    audit(user.id, "cms.route.section.publish", "cms_route_trees", `${slug}:${id}`);
  })();
  updateSite(slug);
  redirect(`${target(slug)}?section_published=${encodeURIComponent(id)}`);
}
