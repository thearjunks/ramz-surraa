import base from "@/data/site";
import { setting } from "./db";

const defaults = { logo: "/images/surraa-logo.png", favicon: "/icon.png", primaryColor: "#2FB35A", accentColor: "#E9EC3A", backgroundColor: "#080A08", seoDescription: "SURRAA Community Association, Kuwait — live music and community events. Request your entry pass online.", ogImage: "/images/poster-en.jpg" };

export function siteContent() {
  const saved = setting("cms_site_content");
  if (!saved) return { ...base, company: { ...defaults, ...base.company } };
  try {
    const value = JSON.parse(saved);
    return {
      ...base,
      company: { ...defaults, ...base.company, ...value.company },
      membership: { ...base.membership, ...value.membership },
      hero: { ...base.hero, ...value.hero },
      artists: value.artists ?? base.artists,
      gallery: value.gallery ?? base.gallery,
    };
  } catch { return { ...base, company: { ...defaults, ...base.company } }; }
}
