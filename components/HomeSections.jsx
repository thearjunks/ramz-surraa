import Link from "next/link";
import Icon from "./Icon";
import Countdown from "./Countdown";
import HeroStage from "./HeroStage";
import { ArtistCard } from "./ui";
import { PassButton } from "./blocks";
import { src } from "@/lib/site";

export default function HomeSections({ sections, site, event }) {
  const C = site.company;
  const artistBy = (slug) => (site.artists || []).find((artist) => artist.slug === slug);
  const lineup = event ? event.lineupArr.map(artistBy).filter(Boolean) : [];
  return sections.filter((section) => section.visible !== false).map((section) => {
    if (section.id === "hero") return <section className="hero hero-c" key="hero">
      <HeroStage slides={section.slides || []} />
      <div className="wrap hero-grid"><div>
        <span className="kicker fade-up">{section.kicker}</span>
        <h1><span className="line"><span className="grad">{section.heading}</span></span></h1>
        <p className="tagline fade-up d1">{section.description}</p>
        <div className="btn-row fade-up d2">
          {event ? <PassButton e={event} /> : <Link className="btn btn-primary" href="/events/">Upcoming events</Link>}
          {section.secondaryHref && <Link className="btn btn-ghost" href={section.secondaryHref}><Icon name="users" />{section.secondaryLabel}</Link>}
        </div>
      </div>{event && <aside className="next-card fade-up d3" aria-label="Next event">
        <div className="nc-top"><Link href={`/events/${event.slug}/`}><img src={src(event.poster)} alt={event.title + " poster"} /></Link>
          <div><div className="lbl">Next event</div><h3><Link href={`/events/${event.slug}/`}>{event.title}</Link></h3><div className="d">{event.dateLabel}<br />{event.area}</div></div></div>
        <Countdown e={event} /><p className="nc-perk"><Icon name="ticket" />{event.stateLabel}</p>
      </aside>}</div>
    </section>;

    if (section.id === "attend") return <section className="section" key="attend"><div className="wrap">
      <div className="m-head reveal"><span className="kicker">{section.kicker}</span><h2>{section.heading === "How to attend" ? <>How to <span className="grad">attend</span></> : section.heading}</h2><p className="lead">{section.description}</p></div>
      <div className="m-steps">{(section.steps || []).map((step, index) => <div key={index} className="m-step reveal"><span className="num">{String(index + 1).padStart(2, "0")}</span><h3>{step.heading}</h3><p>{step.body}</p></div>)}</div>
      <div className="m-cta reveal"><div><small>Already requested?</small><b>Track your entry pass</b></div>
        {section.trackHref && <Link className="btn btn-primary" href={section.trackHref}><Icon name="search" />{section.trackLabel}</Link>}</div>
    </div></section>;

    if (section.id === "sundown") return event && <section className="feature" key="sundown"><div className="wrap feature-grid">
      <Link className="poster reveal" href={`/events/${event.slug}/`}><img src={src(section.poster || event.poster)} alt={event.title + " poster"} loading="lazy" /></Link>
      <div className="reveal"><span className="kicker" style={{ color: "var(--orange)" }}>{section.kicker || `${C.short} presents`}</span>
        <h2 style={{ fontSize: "clamp(56px,9vw,120px)", margin: "12px 0 0" }}><span className="sun">{section.heading || event.title.split("–")[0]}</span></h2>
        <p className="chapter">{(event.title.split("–")[1] || "").trim()}</p>
        <ul className="meta-list"><li><Icon name="cal" />{event.dateLabel}</li>{event.timeLabel && <li><Icon name="clock" />{event.timeLabel}</li>}<li><Icon name="pin" />{event.venue}</li></ul>
        {(section.description || event.description) && <p className="lead" style={{ color: "#E7D9C8", marginBottom: 24 }}>{section.description || event.description}</p>}
        <div className="faces">{lineup.filter((a) => a.photo).map((a) => <img key={a.slug} src={src(a.photo)} alt={a.name} title={a.name} />)}</div>
        <div className="btn-row" style={{ marginTop: 24 }}><PassButton e={event} /><Link className="btn btn-ghost" href={`/events/${event.slug}/`}>{section.buttonLabel || "Event details"} <Icon name="arrow" /></Link></div>
      </div></div></section>;

    if (section.id === "membership") return <section className="section" key="membership"><div className="wrap split">
      <div className="stack reveal"><span className="kicker">{section.kicker}</span><h2>{section.heading === "Free member account" ? <>Free <span className="grad">member account</span></> : section.heading}</h2><p className="lead">{section.description}</p>
        <div className="btn-row">{section.primaryHref && <Link className="btn btn-primary" href={section.primaryHref}><Icon name="users" />{section.primaryLabel}</Link>}
          {section.secondaryHref && <Link className="btn btn-ghost" href={section.secondaryHref}>{section.secondaryLabel}</Link>}</div></div>
      <div className="pillars">{(section.perks || []).map((perk, index) => <div key={index} className="pillar reveal"><span className="icon-disc"><Icon name={perk.icon || "star"} /></span><div><h3>{perk.heading}</h3><p className="muted">{perk.body}</p></div></div>)}</div>
    </div></section>;

    if (section.id === "artists") return <section className="section" style={{ paddingTop: 0 }} key="artists"><div className="wrap">
      <div className="section-head reveal"><div><span className="kicker">{section.kicker}</span><h2>{section.heading}</h2></div>
        {section.buttonHref && <Link className="link-arrow" href={section.buttonHref}>{section.buttonLabel} <Icon name="arrow" /></Link>}</div>
      <div className="grid g4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" }}>
        {(section.people || []).map((artist, index) => <ArtistCard key={artist.slug || index} a={artist} />)}
      </div></div></section>;
    return null;
  });
}
