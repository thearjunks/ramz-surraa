import { db, setting } from "./db";

export const DEFAULT_NAV = [
  ["Home", "/"], ["About", "/about/"], ["Events", "/events/"],
  ["Past Events", "/events/past/"], ["Gallery", "/gallery/"],
  ["Membership", "/membership/"], ["Contact", "/contact/"],
];
export const DEFAULT_FOOTER_NAV = [["Upcoming Events", "/events/"], ["Membership", "/membership/"],
  ["Track Entry Pass", "/track-entry-pass/"], ["Gallery", "/gallery/"], ["Contact", "/contact/"]];

// Published application routes are listed alongside custom CMS pages so editors can
// find every public page without confusing protected admin screens with site content.
export const SITE_ROUTES = [
  ["Home", "/", "home", "/cms/site/"],
  ["About", "/about/", "about", "/cms/site/"],
  ["Events", "/events/", "events", null],
  ["Past events", "/events/past/", "events-past", null],
  ["Gallery", "/gallery/", "gallery", "/cms/site/"],
  ["Membership", "/membership/", "membership", "/cms/site/"],
  ["Contact", "/contact/", "contact", "/cms/site/"],
  ["Artists", "/artists/", "artists", "/cms/site/"],
  ["Privacy", "/privacy/", "privacy", null],
  ["Terms", "/terms/", "terms", null],
];

export function cmsPage(slug, preview = false) {
  const page = db.prepare("SELECT * FROM cms_pages WHERE slug = ?").get(slug);
  if (!page || (!preview && page.status !== "published")) return null;
  return editablePage(page, preview);
}

export function editablePage(page, useDraft = true) {
  const { draft_content, ...fields } = page;
  const stored = { ...fields, sections: JSON.parse(page.sections || "[]") };
  return useDraft && draft_content ? { ...stored, ...JSON.parse(draft_content) } : stored;
}

export function cmsMetadata(page) {
  if (!page) return {};
  return {
    title: page.title,
    description: page.description || undefined,
    keywords: page.keywords || undefined,
    ...(page.canonical_url && { alternates: { canonical: page.canonical_url } }),
    ...(page.og_image && { openGraph: { images: [page.og_image] } }),
  };
}

export function navigationItems(preview = false) {
  if (preview) {
    const draft = setting("cms_navigation_draft");
    if (draft) return JSON.parse(draft);
  }
  if (setting("cms_navigation_configured") !== "1") {
    const defaults = (location, links) => links.map(([label, href], index) => ({
      key: `${location}-${index}`, label, href, location, parentKey: "", visible: true,
    }));
    return [...defaults("header", DEFAULT_NAV), ...defaults("footer", DEFAULT_FOOTER_NAV)];
  }
  return db.prepare("SELECT id,label,href,location,is_visible,item_key,parent_key FROM cms_navigation ORDER BY sort_order,id").all()
    .map((row) => ({ key: row.item_key || String(row.id), label: row.label, href: row.href,
      location: row.location, visible: Boolean(row.is_visible), parentKey: row.parent_key || "" }));
}

export function cmsNavigation(location = "header", preview = false) {
  const visible = navigationItems(preview).filter((item) => item.location === location && item.visible);
  const nodes = new Map(visible.map((item) => [item.key, [item.label, item.href, []]]));
  const roots = [];
  for (const item of visible) {
    const node = nodes.get(item.key);
    if (!item.parentKey) roots.push(node);
    else if (nodes.has(item.parentKey)) nodes.get(item.parentKey)[2].push(node);
  }
  return roots;
}

export const validCmsSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && ![
  "admin", "api", "events", "account", "entry-pass", "entry-pass-pdf", "sign-in", "register",
  "reset-password", "forgot-password", "verify-email", "track-entry-pass",
  "contact", "membership", "cms", "media", "home-preview", "route-preview", "global-preview", "_next",
].includes(s);

export function validCmsHref(href) {
  return href.startsWith("/") && !href.startsWith("//") || /^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(href);
}
