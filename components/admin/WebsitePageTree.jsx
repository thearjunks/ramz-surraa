import Link from "next/link";
import { db } from "@/lib/db";
import { SITE_ROUTES } from "@/lib/cms";

const publishedOverrides = new Set(["about", "artists", "gallery", "privacy", "terms"]);
const stateLabels = { published: "Published", draft: "Draft", archived: "Archived" };
const branchStyle = { listStyle: "none", margin: "6px 0 6px 10px", paddingLeft: 14, borderLeft: "1px solid var(--line)" };
const rowStyle = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", padding: "8px 0" };

function PageNode({ page }) {
  const row = <span style={rowStyle}>
    <strong style={{ flex: "1 1 150px" }}>{page.title}</strong>
    <small className="mono">{page.live ? <a href={page.path} target="_blank" rel="noreferrer">{page.path}</a> : page.path}</small>
    <span className="pill">{page.status}</span>
    {page.editor && <Link href={page.editor}>{page.action}</Link>}
  </span>;
  return <li>{page.children.length ? <details open>
    <summary style={{ cursor: "pointer" }}>{row}</summary>
    <ul style={branchStyle}>{page.children.map((child) => <PageNode key={child.path} page={child} />)}</ul>
  </details> : row}</li>;
}

function filterPage(page, term, status) {
  const children = page.children.map((child) => filterPage(child, term, status)).filter(Boolean);
  const state = page.status.toLowerCase();
  const matches = (!status || state.includes(status)) && [page.title, page.path, state].some((value) => value.toLowerCase().includes(term));
  return matches || children.length ? { ...page, children } : null;
}

export default function WebsitePageTree({ term = "", status = "", events = false, canEditEvents = false, sort = "website" }) {
  const versions = db.prepare("SELECT slug, draft IS NOT NULL AND draft != published AS changed FROM cms_route_trees UNION ALL SELECT 'home', draft IS NOT NULL AND draft != published FROM cms_home").all();
  const drafts = new Set(versions.filter((row) => row.changed).map((row) => row.slug));
  const records = db.prepare("SELECT id,slug,title,status FROM cms_pages ORDER BY title").all();
  const nodes = new Map();
  for (const [title, path, slug] of SITE_ROUTES) {
    const override = publishedOverrides.has(slug) && records.find((p) => p.slug === slug && p.status === "published");
    nodes.set(path, { title, path, status: !override && drafts.has(slug) ? "Published · draft changes" : "Published",
      live: true, editor: override ? `/cms/pages/${override.id}/` : slug === "home" ? "/cms/home/" : `/cms/routes/${slug}/`,
      action: override ? "Edit CMS page" : "Edit page tree", children: [] });
  }
  for (const p of records) {
    const path = `/${p.slug}/`;
    if (!nodes.has(path)) nodes.set(path, { path, title: p.title, status: stateLabels[p.status] || p.status,
      live: p.status === "published", editor: `/cms/pages/${p.id}/`, action: "Edit CMS page", children: [] });
  }
  if (events) {
    for (const e of db.prepare("SELECT id,name,slug,status,is_hidden FROM events ORDER BY date DESC").all()) {
      const path = `/events/${e.slug}/`, live = e.status !== "draft" && !e.is_hidden;
      if (!nodes.has(path)) nodes.set(path, { path, title: e.name, live, status: e.is_hidden ? "Hidden" : live ? "Published" : "Draft",
        editor: canEditEvents ? `/admin/events/${e.id}/` : null, action: "Edit event", children: [] });
    }
  }
  const pages = [...nodes.values()];
  if (sort === "title") pages.sort((a, b) => a.title.localeCompare(b.title));
  for (const page of pages) {
    if (page.path === "/") continue;
    const parent = page.path.replace(/[^/]+\/$/, "");
    (nodes.get(parent) || nodes.get("/")).children.push(page);
  }
  const tree = filterPage(nodes.get("/"), term.trim().toLowerCase(), status);
  return tree ? <ul aria-label="Website page hierarchy" style={{ listStyle: "none", padding: 0 }}><PageNode page={tree} /></ul>
    : <p className="muted">No pages match your filters.</p>;
}

export function DirectoryFilters({ term, status, sort, action }) {
  return <form method="get" action={action} className="a-inline" style={{ marginBottom: 18 }}>
    <input className="input" name="q" defaultValue={term} placeholder="Search pages" aria-label="Search pages" />
    <select className="input" name="status" aria-label="Filter by publication status" defaultValue={status}>
      <option value="">All statuses</option>{["published", "draft", "hidden", "archived"].map((s) => <option key={s} value={s}>{stateLabels[s] || "Hidden"}</option>)}
    </select>
    <select className="input" name="sort" aria-label="Sort pages" defaultValue={sort}>
      <option value="website">Website order</option><option value="title">Title A–Z</option>
    </select>
    <button className="btn btn-ghost btn-sm">Apply</button><Link href={action}>Reset</Link>
  </form>;
}
