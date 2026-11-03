import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { globalContent } from "@/lib/global-content";
import { siteContent } from "@/lib/cms-site";
import { cmsNavigation } from "@/lib/cms";
import { SiteContentProvider } from "@/components/SiteContentProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
export const metadata = { robots: { index: false, follow: false } };
export default async function GlobalPreview({ params }) {
  await requirePerm("content");
  const kind = (await params).kind;
  if (!["header", "footer", "navigation"].includes(kind)) notFound();
  const content = globalContent(kind === "navigation" ? "header" : kind, kind !== "navigation");
  return <SiteContentProvider value={siteContent()}>
    {kind !== "footer" && <Header navigation={cmsNavigation("header", kind === "navigation")} logo={content.logo} brandLabel={content.label} />}
    <main className="wrap" style={{ paddingTop: 140, paddingBottom: 60 }}><h1>Saved {kind} draft</h1><p>This preview is visible to content staff only.</p><Link className="btn btn-ghost" href={kind === "navigation" ? "/cms/navigation/" : `/cms/site/${kind}/`}>Back to editor</Link></main>
    {kind !== "header" && <Footer navigation={cmsNavigation("footer", kind === "navigation")} content={kind === "navigation" ? globalContent("footer") : content} />}
  </SiteContentProvider>;
}
