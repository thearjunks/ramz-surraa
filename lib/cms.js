import { db, setting } from "./db";

export const DEFAULT_NAV = [
  ["Home", "/"], ["About", "/about/"], ["Events", "/events/"],
  ["Past Events", "/events/past/"], ["Gallery", "/gallery/"],
  ["Membership", "/membership/"], ["Contact", "/contact/"],
];

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
  return { ...page, sections: JSON.parse(page.sections || "[]") };
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

export function cmsNavigation(location = "header") {
  const rows = db.prepare("SELECT label, href FROM cms_navigation WHERE location = ? AND is_visible = 1 ORDER BY sort_order, id").all(location);
  const configured = setting("cms_navigation_configured") === "1";
  return configured ? rows.map((r) => [r.label, r.href]) : location === "header" ? DEFAULT_NAV : null;
}

export const validCmsSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && ![
  "admin", "api", "events", "account", "entry-pass", "entry-pass-pdf", "sign-in", "register",
  "reset-password", "forgot-password", "verify-email", "track-entry-pass",
  "contact", "membership", "cms", "media", "_next",
].includes(s);

export function validCmsHref(href) {
  return href.startsWith("/") && !href.startsWith("//") || /^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(href);
}
