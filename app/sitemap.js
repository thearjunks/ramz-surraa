import { db } from "@/lib/db";
import { siteContent } from "@/lib/cms-site";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const base = (siteContent().company.website || "https://www.surraa.com").replace(/\/$/, "");
  const paths = ["", "about", "events", "events/past", "artists", "gallery", "membership", "contact", "privacy", "terms"];
  const pages = db.prepare("SELECT slug, updated_at FROM cms_pages WHERE status = 'published'").all();
  const events = db.prepare("SELECT slug, updated_at FROM events WHERE status != 'draft' AND is_hidden = 0").all();
  const standard = paths.map((path) => ({ url: `${base}/${path ? path + "/" : ""}` }));
  return [
    ...standard,
    ...pages.filter((p) => !paths.includes(p.slug)).map((p) => ({ url: `${base}/${p.slug}/`, lastModified: p.updated_at })),
    ...events.map((e) => ({ url: `${base}/events/${e.slug}/`, lastModified: e.updated_at })),
  ];
}
