import { setting } from "./db";
import { siteContent } from "./cms-site";

export function globalContent(kind, draft = false) {
  const site = siteContent();
  const fallback = kind === "header" ? { logo: site.company.logo || "/images/surraa-logo.png", label: "Community Association" }
    : { logo: site.company.logo || "/images/surraa-logo.png", heading: "Explore",
      description: `${site.company.name}, ${site.company.location}. ${site.company.tagline}`,
      copyright: `${site.company.name} · ${site.company.location}` };
  const raw = (draft && setting(`cms_${kind}_draft`)) || setting(`cms_${kind}_content`);
  if (!raw) return fallback;
  try { return { ...fallback, ...JSON.parse(raw) }; } catch { return fallback; }
}
