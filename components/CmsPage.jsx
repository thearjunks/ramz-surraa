import Link from "next/link";
import Gallery from "./Gallery";
import { ArtistCard } from "./ui";
import { EventCard } from "./blocks";
import { siteContent } from "@/lib/cms-site";
import { publicEvents, view } from "@/lib/bookings";

export default function CmsPage({ page }) {
  return <article>
    {page.sections.filter((s) => s.visible !== false).map((s, i) => {
      const button = s.buttonHref && s.buttonLabel && <Link className="btn btn-primary" href={s.buttonHref}>{s.buttonLabel}</Link>;
      if (s.type === "hero") return <section className="hero" key={i} style={s.image ? { backgroundImage: `linear-gradient(90deg,#080a08cc,#080a0866),url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}><div className="wrap"><h1>{s.heading}</h1>{s.body && <p className="lead">{s.body}</p>}{button}</div></section>;
      if (s.type === "image") return <section className="section" key={i}><div className="wrap"><figure>{s.image && <img src={s.image} alt={s.heading || ""} style={{ maxWidth: "100%", height: "auto" }} />}{s.heading && <figcaption>{s.heading}</figcaption>}</figure>{s.body && <p>{s.body}</p>}</div></section>;
      if (s.type === "gallery") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<Gallery items={siteContent().gallery || []} /></div></section>;
      if (s.type === "artists") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid g4">{(siteContent().artists || []).map((a) => <ArtistCard key={a.slug} a={a} />)}</div></div></section>;
      if (s.type === "events") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid">{publicEvents().map(view).map((e) => <EventCard key={e.id} e={e} />)}</div></div></section>;
      return <section className="section" key={i}><div className="wrap"><div className="stack" style={{ maxWidth: 800 }}>{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead" style={{ whiteSpace: "pre-line" }}>{s.body}</p>}{button}</div></div></section>;
    })}
  </article>;
}
