import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHero, Grad } from "@/components/ui";
import { C, src, page } from "@/lib/site";

export const metadata = { title: "About Us | SURRAA Community Association Kuwait", description: "SURRAA Community Association brings our community in Kuwait together through live music and events." };

export default function About() {
  const P = page("about");
  return (
    <>
      <PageHero crumb="About" lead={P.lead || C.tagline} image={P.heroImage}><h1><Grad t={P.title} /></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap split">
        <div className="stack reveal">
          {P.kicker && <span className="kicker">{P.kicker}</span>}
          <h2><Grad t={P.heading} /></h2>
          {P.intro && <p className="lead">{P.intro}</p>}
          {String(P.body || "").split(/\n\s*\n/).filter(Boolean).map((t, i) => <p key={i} className="muted">{t}</p>)}
          <div className="btn-row"><Link className="btn btn-primary" href="/events/">Upcoming events <Icon name="arrow" /></Link><Link className="btn btn-ghost" href="/membership/">Membership</Link></div>
        </div>
        <div className="photo-stack reveal">{[P.photo1, P.photo2].filter(Boolean).map((p) => <img key={p} src={src(p)} alt="" loading="lazy" />)}</div>
      </div></section>
    </>
  );
}
