import Gallery from "@/components/Gallery";
import { PageHero, Grad } from "@/components/ui";
import { D, page } from "@/lib/site";

export const metadata = { title: "Gallery | SURRAA Community Association", description: "Photos of SURRAA artists and live performances." };

export default function GalleryPage() {
  return (
    <>
      <PageHero crumb="Gallery" image={page("galleryPage").heroImage}><h1><Grad t={page("galleryPage").title} /></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap"><Gallery items={D.gallery || []} /></div></section>
    </>
  );
}
