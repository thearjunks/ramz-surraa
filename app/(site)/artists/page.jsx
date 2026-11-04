import { PageHero, ArtistCard, Grad } from "@/components/ui";
import { D, page } from "@/lib/site";

export const metadata = { title: "Artists | SURRAA Community Association Kuwait", description: "SURRAA artists and the guest artists of SUNDOWN – Chapter 1." };

const grid = { gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" };

export default function Artists() {
  const P = page("artistsPage");
  const by = (g) => (D.artists || []).filter((a) => a.group === g).map((a) => <ArtistCard key={a.slug} a={a} />);
  return (
    <>
      <PageHero crumb="Artists" image={P.heroImage}><h1><Grad t={P.title} /></h1></PageHero>
      {by("guest").length > 0 && <section className="section" style={{ paddingTop: 40 }}><div className="wrap">
        <div className="section-head"><div>{P.guestKicker && <span className="kicker" style={{ color: "var(--orange)" }}>{P.guestKicker}</span>}<h2>{P.guestTitle}</h2></div></div>
        <div className="grid g4" style={grid}>{by("guest")}</div>
      </div></section>}
      {by("team").length > 0 && <section className="section" style={{ paddingTop: by("guest").length ? 0 : 40 }}><div className="wrap">
        <div className="section-head"><div>{P.teamKicker && <span className="kicker">{P.teamKicker}</span>}<h2>{P.teamTitle}</h2></div></div>
        <div className="grid g4" style={grid}>{by("team")}</div>
      </div></section>}
    </>
  );
}
