import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import Countdown from "@/components/Countdown";
import Gallery from "@/components/Gallery";
import { StickyPad } from "@/components/EventClient";
import { Crumbs, ArtistCard } from "@/components/ui";
import { PassButton } from "@/components/blocks";
import { src } from "@/lib/site";
import { siteContent } from "@/lib/cms-site";
import { getEvent, view, gcal } from "@/lib/bookings";

export const dynamic = "force-dynamic";

const load = async (params) => { const e = getEvent((await params).slug); return e && e.status !== "draft" && !e.is_hidden ? view(e) : null; };

export async function generateMetadata({ params }) {
  const e = await load(params);
  return e ? { title: `${e.title} | ${e.dateLabel} – SURRAA Community Association`, description: `${e.description || e.title} ${e.venue}, ${e.area}.`,
    alternates: { canonical: `/events/${e.slug}/` }, openGraph: { images: [src(e.poster)] } } : {};
}

export default async function EventPage({ params }) {
  const D = siteContent();
  const C = D.company;
  const artistBy = (slug) => (D.artists || []).find((a) => a.slug === slug);
  const e = await load(params);
  if (!e) notFound();
  const lineup = e.lineupArr.map(artistBy).filter(Boolean);
  const gal = e.galleryArr.map((s) => (D.gallery || []).find((x) => x.src === s) || { src: s, alt: e.title });
  const [t1, t2] = e.title.split("–");
  const ld = { "@context": "https://schema.org", "@type": "Event", name: e.title, startDate: e.start, ...(e.end && { endDate: e.end }),
    eventStatus: e.state.key === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressLocality: e.area, addressCountry: "KW" } },
    image: [C.website + src(e.poster)], description: e.description, organizer: { "@type": "Organization", name: C.name, url: C.website },
    performer: lineup.map((a) => ({ "@type": "Person", name: a.name })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replaceAll("<", "\\u003c") }} />
      {e.state.open && <StickyPad />}
      <section className="ev-hero">
        <div className="bg" style={{ backgroundImage: `url(${src(e.poster)})` }} />
        <div className="wrap"><div className="feature-grid">
          <div className="poster">{e.poster && <img src={src(e.poster)} alt={e.title + " event poster"} />}</div>
          <div>
            <Crumbs items={[["Events", "/events/"], [e.title]]} />
            <div className="pills" style={{ margin: "22px 0 14px" }}><span className={"pill " + (e.state.open ? "up" : "")}>{e.stateLabel}</span>{e.category && <span className="pill">{e.category}</span>}<span className="pill">{e.event_code}</span></div>
            <h1 style={{ fontSize: "clamp(48px,7vw,96px)" }}><span className="sun">{t1}</span>{t2 && <><br /><span style={{ fontSize: ".45em", letterSpacing: ".2em" }}>{t2.trim()}</span></>}</h1>
            <div className="facts">
              <div className="fact"><small>Date</small><b>{e.dateLabel}</b></div>
              {e.timeLabel && <div className="fact"><small>Time</small><b>{e.timeLabel}</b></div>}
              <div className="fact"><small>Venue</small><b>{e.venue}<br /><span className="muted">{e.area}</span></b></div>
            </div>
            {e.state.key !== "completed" && e.state.key !== "cancelled" && <Countdown e={e} />}
            {e.availability && <div className="m-banner"><Icon name="ticket" /><span>{e.availability}</span></div>}
            {!!e.members_only && <div className="m-banner"><Icon name="users" /><span><b>Members only.</b> Sign in or create a free account to request a pass.</span></div>}
            <div className="btn-row"><PassButton e={e} label="GET ENTRY PASS" />
              <a className="btn btn-ghost" href={gcal(e)} target="_blank" rel="noopener"><Icon name="cal" />Add to calendar</a></div>
          </div>
        </div></div>
      </section>

      {lineup.length > 0 && <section className="section" style={{ paddingTop: 40 }}><div className="wrap">
        <div className="section-head"><div><span className="kicker">Line-up</span><h2>On stage</h2></div></div>
        <div className="grid g4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" }}>
          {lineup.map((a) => <ArtistCard key={a.slug} a={a} tag={a.group === "guest" ? "From Sri Lanka" : "Kuwait"} />)}
        </div>
      </div></section>}

      <section className="section" style={{ paddingTop: 0 }}><div className="wrap split" style={{ alignItems: "start" }}>
        <div className="stack"><span className="kicker">Venue</span><h2>{e.venue}</h2><p className="lead">{e.area}</p>
          {e.map_url && <a className="link-arrow" target="_blank" rel="noopener" href={e.map_url}>Open in Google Maps <Icon name="arrow" /></a>}
          <div className="faq" style={{ marginTop: 20 }}>
            <details><summary>How do I get an entry pass?</summary><p>Press “Get entry pass” and submit your request. Our team confirms every request personally and contacts you. Your official pass with QR code is issued after confirmation.</p></details>
            <details><summary>Is my request an entry pass?</summary><p>No. The acknowledgement you receive after requesting is not valid for entry. Only the official confirmed pass with a QR code admits you.</p></details>
            <details><summary>How do I check my request?</summary><p>Use “Track Entry Pass” with your booking reference and email or mobile number, or sign in to “My Entry Passes”.</p></details>
            {e.terms && <details><summary>Terms & conditions</summary><p style={{ whiteSpace: "pre-line" }}>{e.terms}</p></details>}
          </div>
        </div>
        <div className="map"><iframe loading="lazy" title={"Map: " + e.venue} src={"https://maps.google.com/maps?q=" + encodeURIComponent(e.venue + ", " + e.area) + "&z=15&output=embed"} /></div>
      </div></section>

      {gal.length > 0 && <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><span className="kicker">Gallery</span><h2>Moments</h2></div></div>
        <Gallery items={gal} />
      </div></section>}

      {e.state.open && <div className="sticky-cta"><PassButton e={e} label="GET ENTRY PASS" /></div>}
    </>
  );
}
