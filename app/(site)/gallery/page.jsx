import Gallery from "@/components/Gallery";
import { PageHero } from "@/components/ui";
import { D } from "@/lib/site";

export const metadata = { title: "Gallery | SURRAA Community Association", description: "Photos of SURRAA artists and live performances." };

export default function GalleryPage() {
  return (
    <>
      <PageHero crumb="Gallery"><h1><span className="grad">Gallery</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap"><Gallery items={D.gallery || []} /></div></section>
    </>
  );
}
