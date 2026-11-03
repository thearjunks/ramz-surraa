import Link from "next/link";
import Icon from "./Icon";
import Gallery from "./Gallery";
import ContactLink from "./ContactLink";
import EnquiryForm, { Field } from "./EnquiryForm";
import { PageHero, ArtistCard } from "./ui";
import { EventCard } from "./blocks";
import CmsPageExtras from "./CmsPageExtras";
import { currentUser } from "@/lib/auth";
import { siteContent } from "@/lib/cms-site";
import { routeTreeVersions } from "@/lib/route-tree";
import { publicEvents, view } from "@/lib/bookings";

const LABELS = { about: "About", events: "Upcoming Events", "events-past": "Past Events", gallery: "Gallery",
  membership: "Membership", contact: "Contact", artists: "Artists", privacy: "Privacy Policy", terms: "Terms" };
const grid = { gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))" };
const ACCENTS = { about: ["SURRAA", "grad"], events: ["events", "sun"], "events-past": ["events", "grad"],
  gallery: ["Gallery", "grad"], membership: ["member", "grad"], contact: ["us", "grad"], artists: ["artists", "grad"] };
function highlighted(text, phrase, className = "grad") {
  if (!phrase || !text?.includes(phrase)) return text;
  const offset = text.lastIndexOf(phrase);
  return <>{text.slice(0, offset)}<span className={className}>{phrase}</span>{text.slice(offset + phrase.length)}</>;
}
function paragraph(text) {
  return String(text || "").split(/(info@surraa\.com)/).map((part, i) => part === "info@surraa.com"
    ? <a key={i} href="mailto:info@surraa.com">{part}</a> : part);
}

export default async function RouteTreePage({ slug, preview = false, sectionId = null }) {
  const versions = routeTreeVersions(slug);
  const nodes = preview ? versions.draft : versions.published;
  const site = siteContent();
  const member = slug === "membership" ? await currentUser() : null;
  const visible = nodes.filter((s) => s.visible !== false && (!sectionId || s.id === sectionId));
  const panelTypes = new Set(["benefits", "account", "contact-details", "contact-form"]);
  const samePanelGroup = (a, b) => a && b && (
    ["benefits", "account"].includes(a.type) && ["benefits", "account"].includes(b.type) ||
    ["contact-details", "contact-form"].includes(a.type) && ["contact-details", "contact-form"].includes(b.type));
  const renderPanel = (s) => {
    if (s.type === "benefits") return <div className="pillars" key={s.id}>{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead">{s.body}</p>}{(s.items || []).map((item, i) =>
      <div className="pillar reveal" key={i}><span className="icon-disc"><Icon name={item.icon || "star"} /></span><div><h3>{item.heading}</h3><p className="muted">{item.body}</p></div></div>)}</div>;
    if (s.type === "account") return <div className="card cta-card" key={s.id}>
      <span className="kicker">{s.kicker}</span><h2>{member ? `Welcome, ${member.name.split(" ")[0]}` : s.heading}</h2>
      <p className="muted">{member ? `Your membership ID is ${member.membership_id}.` : s.body}</p>
      <div className="btn-row">{member ? <Link className="btn btn-primary" href="/account/">My account</Link>
        : <><Link className="btn btn-primary" href="/register/"><Icon name="users" />Create free account</Link><Link className="btn btn-ghost" href="/sign-in/">Sign in</Link></>}</div>
    </div>;
    if (s.type === "contact-details") return <div className="stack" key={s.id}>{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead">{s.body}</p>}<ul className="contact-list">
      {(s.items || []).map((item, i) => <li key={i}><span className="icon-disc"><Icon name={item.icon || "mail"} /></span><div><small>{item.heading}</small>
        {item.key === "location" ? site.company.location : <ContactLink k={item.key} />}</div></li>)}
    </ul></div>;
    return <div className="card" key={s.id} style={{ padding: "clamp(24px,4vw,44px)" }}>
      <h2 style={{ fontSize: 34, marginBottom: 22 }}>{s.heading}</h2>{s.body && <p className="muted">{s.body}</p>}<EnquiryForm title="Website message">
        <Field id="f-name" label="Name *" name="name" required autoComplete="name" err="Please enter your name." full />
        <Field id="f-phone" label="Phone / WhatsApp *" type="tel" name="phone" required autoComplete="tel" placeholder="+965" err="Please enter a valid number." full />
        <Field id="f-msg" label="Message *" as="textarea" name="message" required full err="Please write a short message." />
      </EnquiryForm></div>;
  };
  return <>
    {visible.map((s, index) => {
      if (s.type === "hero") return <PageHero key={s.id} crumb={LABELS[slug]} lead={s.body}>
        <h1>{highlighted(s.heading, ...(ACCENTS[slug] || []))}</h1></PageHero>;
      if (panelTypes.has(s.type)) {
        if (samePanelGroup(visible[index - 1], s)) return null;
        const next = samePanelGroup(s, visible[index + 1]) ? visible[index + 1] : null;
        return <section className="section" key={s.id} style={{ paddingTop: slug === "membership" ? 30 : 40 }}>
          <div className={next ? "wrap split" : "wrap"} style={{ alignItems: "start" }}>{renderPanel(s)}{next && renderPanel(next)}</div>
        </section>;
      }
      if (s.type === "story") return <section className="section" key={s.id} style={{ paddingTop: 30 }}><div className="wrap split">
        <div className="stack reveal"><span className="kicker">{s.kicker}</span><h2>{highlighted(s.heading, "people together")}</h2>
          <p className="lead">{s.body}</p>{(s.items || []).map((item, i) => <p className="muted" key={i}>{item.body}</p>)}
          <div className="btn-row"><Link className="btn btn-primary" href="/events/">Upcoming events <Icon name="arrow" /></Link><Link className="btn btn-ghost" href="/membership/">Membership</Link></div>
        </div><div className="photo-stack reveal">{(s.images || []).map((image, i) => <img key={i} src={image} alt={image === "/images/g-ambika-mono.jpg" ? "Ambika Rajesh in concert" : image === "/images/g-ramz-live.jpg" ? "RAMZ RMZN live" : s.heading} loading="lazy" />)}</div>
      </div></section>;
      if (s.type === "events" || s.type === "past-events") {
        const list = publicEvents(s.type === "past-events").map(view);
        return <section className="section" key={s.id} style={{ paddingTop: 40 }}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid">
          {list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <div className="empty"><h3>{s.body}</h3><p>{s.items?.[0]?.body}</p></div>}
        </div></div></section>;
      }
      if (s.type === "gallery") return <section className="section" key={s.id} style={{ paddingTop: 40 }}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead">{s.body}</p>}<Gallery items={s.items || []} /></div></section>;
      if (s.type === "artist-group") return <section className="section" key={s.id} style={{ paddingTop: s.id === "team" ? 0 : 40 }}><div className="wrap">
        <div className="section-head"><div><span className="kicker">{s.kicker}</span><h2>{s.heading}</h2></div></div>
        {s.body && <p className="lead">{s.body}</p>}
        <div className="grid g4" style={grid}>{(s.items || []).map((a, i) => <ArtistCard key={a.slug || i} a={a} />)}</div>
      </div></section>;
      if (s.type === "article") return <section className="section" key={s.id}><div className="wrap prose">
        {s.heading && <h2>{s.heading}</h2>}{s.body && <p><em>{s.body}</em></p>}{(s.items || []).map((item, i) => <div key={i}><h2>{item.heading}</h2>
          {String(item.body || "").split("\n\n").map((text, j) => <p key={j} style={{ whiteSpace: "pre-line" }}>{paragraph(text)}</p>)}</div>)}
      </div></section>;
      return null;
    })}
    {!sectionId && <CmsPageExtras slug={slug} preview={preview} />}
  </>;
}
