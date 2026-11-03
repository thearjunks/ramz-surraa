import Gallery from "@/components/Gallery";
import { PageHero } from "@/components/ui";
import { siteContent } from "@/lib/cms-site";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";

export function generateMetadata() { const page = cmsPage("gallery"); return page ? cmsMetadata(page) : { title: "Gallery | SURRAA Community Association", description: "Photos of SURRAA artists and live performances." }; }

export default function GalleryPage() {
  const page = cmsPage("gallery");
  if (page) return <CmsPage page={page} />;
  const D = siteContent();
  return (
    <>
      <PageHero crumb="Gallery"><h1><span className="grad">Gallery</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap"><Gallery items={D.gallery || []} /></div></section>
    </>
  );
}
