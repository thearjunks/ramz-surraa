import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHero } from "@/components/ui";
import { siteContent } from "@/lib/cms-site";

export const metadata = { title: "About Us | SURRAA Community Association Kuwait", description: "SURRAA Community Association brings our community in Kuwait together through live music and events." };

export default function About() {
  const C = siteContent().company;
  return (
    <>
      <PageHero crumb="About" lead={C.tagline}><h1>About <span className="grad">SURRAA</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap split">
        <div className="stack reveal">
          <span className="kicker">Who we are</span>
          <h2>Music that brings <span className="grad">people together</span></h2>
          <p className="lead">{C.name} connects our community in Kuwait through live music, local and international artists, and shared experiences.</p>
          <p className="muted">Our first concert, SUNDOWN – Chapter 1, brings artists from Sri Lanka together with Kuwait-based performers.</p>
          <div className="btn-row"><Link className="btn btn-primary" href="/events/">Upcoming events <Icon name="arrow" /></Link><Link className="btn btn-ghost" href="/membership/">Membership</Link></div>
        </div>
        <div className="photo-stack reveal"><img src="/images/g-ambika-mono.jpg" alt="Ambika Rajesh in concert" loading="lazy" /><img src="/images/g-ramz-live.jpg" alt="RAMZ RMZN live" loading="lazy" /></div>
      </div></section>
    </>
  );
}
