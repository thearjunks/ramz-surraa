import Link from "next/link";
import Icon from "@/components/Icon";
import Countdown from "@/components/Countdown";
import HeroStage from "@/components/HeroStage";
import { ArtistCard, Grad } from "@/components/ui";
import { PassButton } from "@/components/blocks";
import { C, D, src, artistBy, page } from "@/lib/site";
import { publicEvents, view } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export default function Home() {
  const P = page("home");
  const e = publicEvents().map(view)[0];
  const lineup = e ? e.lineupArr.map(artistBy).filter(Boolean) : [];
  const jsonLd = { "@context": "https://schema.org", "@type": "Organization", name: C.name, url: C.website, logo: C.website + "/images/surraa-logo.png", email: C.email, telephone: C.phone, address: { "@type": "PostalAddress", addressCountry: "KW" } };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />

      <section className="hero hero-c">
        <HeroStage slides={D.hero?.slides || []} />
        <div className="wrap hero-grid">
          <div>
            {P.heroKicker && <span className="kicker fade-up">{P.heroKicker}</span>}
            <h1><span className="line"><Grad t={P.heroTitle} /></span></h1>
            <p className="tagline fade-up d1">{C.tagline}</p>
            <div className="btn-row fade-up d2">
              {e ? <PassButton e={e} /> : <Link className="btn btn-primary" href="/events/">Upcoming events</Link>}
              <Link className="btn btn-ghost" href="/membership/"><Icon name="users" />{P.heroButton2}</Link>
            </div>
          </div>
          {e && (
            <aside className="next-card fade-up d3" aria-label="Next event">
              <div className="nc-top">
                <Link href={`/events/${e.slug}/`}><img src={src(e.poster)} alt={e.title + " poster"} /></Link>
                <div><div className="lbl">Next event</div><h3><Link href={`/events/${e.slug}/`}>{e.title}</Link></h3><div className="d">{e.dateLabel}<br />{e.area}</div></div>
              </div>
              <Countdown e={e} />
              <p className="nc-perk"><Icon name="ticket" />{e.stateLabel}</p>
            </aside>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="m-head reveal">
            {P.attendKicker && <span className="kicker">{P.attendKicker}</span>}
            <h2><Grad t={P.attendTitle} /></h2>
            {P.attendLead && <p className="lead">{P.attendLead}</p>}
          </div>
          <div className="m-steps">
            {(P.attendSteps || []).map((s, i) => (
              <div key={i} className="m-step reveal"><span className="num">{String(i + 1).padStart(2, "0")}</span><h3>{s.title}</h3><p>{s.text}</p></div>))}
          </div>
          <div className="m-cta reveal">
            <div><small>{P.trackSmall}</small><b>{P.trackTitle}</b></div>
            <Link className="btn btn-primary" href="/track-entry-pass/"><Icon name="search" />Track request</Link>
          </div>
        </div>
      </section>

      {e && (
        <section className="feature">
          <div className="wrap feature-grid">
            <Link className="poster reveal" href={`/events/${e.slug}/`}><img src={src(e.poster)} alt={e.title + " poster"} loading="lazy" /></Link>
            <div className="reveal">
              <span className="kicker" style={{ color: "var(--orange)" }}>{C.short} presents</span>
              <h2 style={{ fontSize: "clamp(56px,9vw,120px)", margin: "12px 0 0" }}><span className="sun">{e.title.split("–")[0]}</span></h2>
              <p className="chapter">{(e.title.split("–")[1] || "").trim()}</p>
              <ul className="meta-list"><li><Icon name="cal" />{e.dateLabel}</li>{e.timeLabel && <li><Icon name="clock" />{e.timeLabel}</li>}<li><Icon name="pin" />{e.venue}</li></ul>
              {e.description && <p className="lead" style={{ color: "#E7D9C8", marginBottom: 24 }}>{e.description}</p>}
              <div className="faces">{lineup.filter((a) => a.photo).map((a) => <img key={a.slug} src={src(a.photo)} alt={a.name} title={a.name} />)}</div>
              <div className="btn-row" style={{ marginTop: 24 }}><PassButton e={e} /><Link className="btn btn-ghost" href={`/events/${e.slug}/`}>Event details <Icon name="arrow" /></Link></div>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap split">
          <div className="stack reveal">
            {P.memberKicker && <span className="kicker">{P.memberKicker}</span>}
            <h2><Grad t={P.memberTitle} /></h2>
            {P.memberLead && <p className="lead">{P.memberLead}</p>}
            <div className="btn-row"><Link className="btn btn-primary" href="/register/"><Icon name="users" />Create free account</Link><Link className="btn btn-ghost" href="/sign-in/">Sign in</Link></div>
          </div>
          <div className="pillars">
            {(P.memberPoints || []).map((x, i) => (
              <div key={i} className="pillar reveal"><span className="icon-disc"><Icon name={x.icon || "star"} /></span><div><h3>{x.title}</h3><p className="muted">{x.text}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head reveal"><div>{P.artistsKicker && <span className="kicker">{P.artistsKicker}</span>}<h2>{P.artistsTitle}</h2></div><Link className="link-arrow" href="/artists/">All artists <Icon name="arrow" /></Link></div>
          <div className="grid g4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" }}>
            {(D.artists || []).filter((a) => a.photo).slice(0, Number(P.artistsCount) || 4).map((a) => <ArtistCard key={a.slug} a={a} />)}
          </div>
        </div>
      </section>
    </>
  );
}
