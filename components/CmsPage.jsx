import Link from "next/link";

export default function CmsPage({ page }) {
  return <article>
    {page.sections.filter((s) => s.visible !== false).map((s, i) => {
      const button = s.buttonHref && s.buttonLabel && <Link className="btn btn-primary" href={s.buttonHref}>{s.buttonLabel}</Link>;
      if (s.type === "hero") return <section className="hero" key={i} style={s.image ? { backgroundImage: `linear-gradient(90deg,#080a08cc,#080a0866),url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}><div className="wrap"><h1>{s.heading}</h1>{s.body && <p className="lead">{s.body}</p>}{button}</div></section>;
      if (s.type === "image") return <section className="section" key={i}><div className="wrap"><figure>{s.image && <img src={s.image} alt={s.heading || ""} style={{ maxWidth: "100%", height: "auto" }} />}{s.heading && <figcaption>{s.heading}</figcaption>}</figure>{s.body && <p>{s.body}</p>}</div></section>;
      return <section className="section" key={i}><div className="wrap"><div className="stack" style={{ maxWidth: 800 }}>{s.heading && <h2>{s.heading}</h2>}{s.body && <p className="lead" style={{ whiteSpace: "pre-line" }}>{s.body}</p>}{button}</div></div></section>;
    })}
  </article>;
}
