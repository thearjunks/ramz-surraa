import { siteContent } from "@/lib/cms-site";

export const dynamic = "force-dynamic";
export default function robots() {
  const base = (siteContent().company.website || "https://www.surraa.com").replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/cms/", "/account/", "/entry-pass/"] }, sitemap: `${base}/sitemap.xml` };
}
