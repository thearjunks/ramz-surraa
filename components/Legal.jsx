// Privacy / Terms pages: blocks of heading + text edited in the CMS.
import { PageHero, Grad } from "./ui";
import { DEFAULT_TERMS } from "@/lib/db";
import { page } from "@/lib/site";

const linkify = (t) => String(t).split(/([\w.+-]+@[\w-]+\.[\w.]+)/).map((x, i) => (/@/.test(x) && /\./.test(x) ? <a key={i} href={"mailto:" + x}>{x}</a> : x));

export default function Legal({ k, crumb }) {
  const P = page(k);
  return (
    <>
      <PageHero crumb={crumb} lead={P.lead} image={P.heroImage}><h1><Grad t={P.title} /></h1></PageHero>
      <section className="section"><div className="wrap prose">
        {(P.sections || []).map((s, i) => (
          <div key={i}>
            {s.heading && <h2>{s.heading}</h2>}
            {String(s.text || "").replace("{EVENT_TERMS}", DEFAULT_TERMS).split(/\n\s*\n/).filter(Boolean).map((t, j) => <p key={j}>{linkify(t)}</p>)}
          </div>
        ))}
      </div></section>
    </>
  );
}
