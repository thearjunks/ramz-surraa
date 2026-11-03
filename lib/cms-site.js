import base from "@/data/site";
import { setting, db } from "./db";

const defaults = { logo: "/images/surraa-logo.png", favicon: "/icon.png", primaryColor: "#2FB35A", accentColor: "#E9EC3A", backgroundColor: "#080A08", seoDescription: "SURRAA Community Association, Kuwait — live music and community events. Request your entry pass online.", ogImage: "/images/poster-en.jpg" };

export function siteContent() {
  const saved = setting("cms_site_content");
  let content;
  try {
    const value = saved ? JSON.parse(saved) : {};
    content = {
      ...base,
      company: { ...defaults, ...base.company, ...value.company },
      membership: { ...base.membership, ...value.membership },
      hero: { ...base.hero, ...value.hero },
      artists: value.artists ?? base.artists,
      gallery: value.gallery ?? base.gallery,
    };
  } catch { content = { ...base, company: { ...defaults, ...base.company } }; }
  // Published page collections are the shared source once an editor saves a tree.
  for (const slug of ["gallery", "artists"]) {
    const row = db.prepare("SELECT published FROM cms_route_trees WHERE slug=?").get(slug);
    if (!row) continue;
    try {
      const sections = JSON.parse(row.published);
      content[slug] = slug === "gallery" ? sections.find((s) => s.type === "gallery")?.items || []
        : sections.filter((s) => s.type === "artist-group").flatMap((s) => (s.items || []).map((a) => ({ ...a, group: s.group })));
    } catch { /* Retain the prior content if a legacy snapshot is malformed. */ }
  }
  return content;
}
