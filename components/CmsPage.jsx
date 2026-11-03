import Link from "next/link";
import Gallery from "./Gallery";
import { ArtistCard } from "./ui";
import { EventCard } from "./blocks";
import { siteContent } from "@/lib/cms-site";
import { publicEvents, view } from "@/lib/bookings";
import { db } from "@/lib/db";
import RouteTreePage from "./RouteTreePage";
import HomeSections from "./HomeSections";
import { homeVersions } from "@/lib/home-cms";
import { ROUTE_TREE_SLUGS } from "@/lib/route-tree";

export default function CmsPage({ page }) {
  return <article>
    {page.sections.filter((s) => s.visible !== false).map((item, i) => {
      const s = item.type === "component" ? JSON.parse(db.prepare("SELECT COALESCE(published_section,section) section FROM cms_components WHERE id = ? AND status='published'").get(Number(item.componentId))?.section || "null") : item;
      if (!s || s.visible === false) return null;
      if (s.type === "shared-section") {
        const [slug, id] = String(s.source || "").split("/");
        if (!id) return null;
        if (slug === "home") return <HomeSections key={i} sections={homeVersions().published.filter((section) => section.id === id)} site={siteContent()} event={publicEvents().map(view)[0]} />;
        return ROUTE_TREE_SLUGS.includes(slug) ? <RouteTreePage key={i} slug={slug} sectionId={id} /> : null;
      }
      const button = s.buttonHref && s.buttonLabel && <Link className="btn btn-primary" href={s.buttonHref}>{s.buttonLabel}</Link>;
      if (s.type === "hero") return <section className="hero" key={i} style={s.image ? { backgroundImage: `linear-gradient(90deg,#080a08cc,#080a0866),url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}><div className="wrap"><h1>{s.heading}</h1>{s.body && <p className="lead">{s.body}</p>}{button}</div></section>;
      if (s.type === "image") return <section className="section" key={i}><div className="wrap"><figure>{s.image && <img src={s.image} alt={s.heading || ""} style={{ maxWidth: "100%", height: "auto" }} />}{s.heading && <figcaption>{s.heading}</figcaption>}</figure>{s.body && <p>{s.body}</p>}</div></section>;
      if (s.type === "gallery") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<Gallery items={siteContent().gallery || []} /></div></section>;
      if (s.type === "artists") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid g4">{(siteContent().artists || []).map((a) => <ArtistCard key={a.slug} a={a} />)}</div></div></section>;
      if (s.type === "events") return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid">{publicEvents().map(view).map((e) => <EventCard key={e.id} e={e} />)}</div></div></section>;
      if (s.type === "collection") {
        const model = db.prepare("SELECT fields FROM cms_collection_types WHERE id=?").get(Number(s.collectionId));
        if (!model) return null;
        const fields = JSON.parse(model.fields);
        const entries = db.prepare("SELECT id,COALESCE(published_data,data) AS data FROM cms_collection_entries WHERE type_id=? AND status='published' ORDER BY id DESC LIMIT 24").all(Number(s.collectionId));
        return <section className="section" key={i}><div className="wrap">{s.heading && <h2>{s.heading}</h2>}<div className="grid g3">{entries.map((entry) => {
          const values = JSON.parse(entry.data);
          return <article className="card" key={entry.id} style={{ padding: 24 }}>{fields.map((field) => {
            const value = values[field.key];
            if (value === undefined || value === "" || value === false) return null;
            if (field.type === "media") return <img key={field.key} src={value} alt={String(values.title || field.label)} style={{ maxWidth: "100%", height: "auto" }} />;
            if (field.type === "boolean") return <p key={field.key}>{field.label}: Yes</p>;
            if (field.type === "relation") {
              const related = db.prepare("SELECT COALESCE(published_data,data) data FROM cms_collection_entries WHERE id=? AND type_id=? AND status='published'").get(Number(value), Number(field.collectionId));
              if (!related) return null;
              const values = JSON.parse(related.data);
              const label = values.title || values.name || Object.values(values).find((v) => typeof v === "string") || `Entry ${value}`;
              return <p key={field.key}><b>{field.label}:</b> {String(label)}</p>;
            }
            return <p key={field.key} style={{ whiteSpace: "pre-line" }}><b>{field.label}:</b> {String(value)}</p>;
          })}</article>;
        })}</div></div></section>;
      }
      return <section className="section" key={i}><div className="wrap"><div className="stack" style={{ maxWidth: 800 }}>{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead" style={{ whiteSpace: "pre-line" }}>{s.body}</p>}{button}</div></div></section>;
    })}
  </article>;
}
