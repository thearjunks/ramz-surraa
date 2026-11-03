import { db } from "./db";

export const DEFAULT_NAV = [
  ["Home", "/"], ["About", "/about/"], ["Events", "/events/"],
  ["Past Events", "/events/past/"], ["Gallery", "/gallery/"],
  ["Membership", "/membership/"], ["Contact", "/contact/"],
];

export function cmsPage(slug, preview = false) {
  const page = db.prepare("SELECT * FROM cms_pages WHERE slug = ?").get(slug);
  if (!page || (!preview && page.status !== "published")) return null;
  return { ...page, sections: JSON.parse(page.sections || "[]") };
}

export function cmsNavigation(location = "header") {
  const rows = db.prepare("SELECT label, href FROM cms_navigation WHERE location = ? AND is_visible = 1 ORDER BY sort_order, id").all(location);
  const configured = db.prepare("SELECT 1 FROM cms_navigation WHERE location = ? LIMIT 1").get(location);
  return configured ? rows.map((r) => [r.label, r.href]) : location === "header" ? DEFAULT_NAV : null;
}

export const validCmsSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && ![
  "admin", "api", "events", "account", "entry-pass", "entry-pass-pdf", "sign-in", "register",
  "reset-password", "forgot-password", "verify-email", "track-entry-pass", "about", "artists",
  "contact", "gallery", "membership", "privacy", "terms", "_next",
].includes(s);

export function validCmsHref(href) {
  return href.startsWith("/") && !href.startsWith("//") || /^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(href);
}
