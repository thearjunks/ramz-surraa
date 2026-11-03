import { PageHero, ArtistCard } from "@/components/ui";
import { siteContent } from "@/lib/cms-site";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";

export function generateMetadata() { const page = cmsPage("artists"); return page ? cmsMetadata(page) : { title: "Artists | SURRAA Community Association Kuwait", description: "SURRAA artists and the guest artists of SUNDOWN – Chapter 1." }; }

const grid = { gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" };

export default function Artists() {
  const page = cmsPage("artists");
  if (page) return <CmsPage page={page} />;
  const D = siteContent();
  const by = (g) => (D.artists || []).filter((a) => a.group === g).map((a) => <ArtistCard key={a.slug} a={a} />);
  return (
    <>
      <PageHero crumb="Artists"><h1>Our <span className="grad">artists</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap">
        <div className="section-head"><div><span className="kicker" style={{ color: "var(--orange)" }}>SUNDOWN – Chapter 1</span><h2>From Sri Lanka</h2></div></div>
        <div className="grid g4" style={grid}>{by("guest")}</div>
      </div></section>
      <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><span className="kicker">Kuwait</span><h2>SURRAA artists</h2></div></div>
        <div className="grid g4" style={grid}>{by("team")}</div>
      </div></section>
    </>
  );
}
