import base from "@/data/site";
import { setting } from "./db";

export function siteContent() {
  const saved = setting("cms_site_content");
  if (!saved) return { ...base, company: { logo: "/images/surraa-logo.png", ...base.company } };
  try {
    const value = JSON.parse(saved);
    return {
      ...base,
      company: { logo: "/images/surraa-logo.png", ...base.company, ...value.company },
      membership: { ...base.membership, ...value.membership },
      hero: { ...base.hero, ...value.hero },
      artists: value.artists ?? base.artists,
      gallery: value.gallery ?? base.gallery,
    };
  } catch { return { ...base, company: { logo: "/images/surraa-logo.png", ...base.company } }; }
}
