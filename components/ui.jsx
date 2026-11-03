// Small shared building blocks (server components).
import Link from "next/link";
import Icon from "./Icon";
import { src, status } from "@/lib/site";
import { siteContent } from "@/lib/cms-site";

export function PageHero({ crumb, children, lead }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <Crumbs items={[[crumb]]} />
        {children}
        {lead && <p className="lead">{lead}</p>}
      </div>
    </section>
  );
}

export function Crumbs({ items }) {
  return (
    <ol className="crumbs" aria-label="Breadcrumb">
      <li><Link href="/">Home</Link></li>
      {items.map(([t, u]) => u ? <li key={t}><Link href={u}>{t}</Link></li> : <li key={t} aria-current="page">{t}</li>)}
    </ol>
  );
}

export function ArtistCard({ a, tag }) {
  return (
    <div className="artist reveal" style={{ cursor: "default" }}>
      {a.photo ? <img src={src(a.photo)} alt={a.name} loading="lazy" />
        : <div className="placeholder-art"><img src="/images/surraa-logo.png" alt="" /><small>Photo coming soon</small></div>}
      {tag && <span className="tag">{tag}</span>}
      <div className="info"><div className="role">{a.role}</div><h3>{a.name}</h3></div>
    </div>
  );
}

export function JoinButton({ cls = "btn-primary", children = "Become a member" }) {
  return <Link className={"btn " + cls} href="/join/"><Icon name="users" />{children}</Link>;
}

export function StatusPill({ e }) {
  const st = status(e);
  return <span className={"pill " + (st === "Past" ? "past" : "up")}>{st}</span>;
}

export const lcFirst = (s = "") => s.charAt(0).toLowerCase() + s.slice(1);

export const feeText = () => { const M = siteContent().membership; return M.fee ? `${M.fee}${M.period ? " " + M.period : ""}` : "Shared on WhatsApp"; };

// The 3-step "how membership works" strip, used on Home and Join
export function Steps({ col }) {
  const M = siteContent().membership;
  const s = [
    ["01", "Register", "Fill in the short form — name, WhatsApp, nationality and area."],
    ["02", "Pay the fee", M.fee ? `Membership fee ${feeText()}. We send payment details on WhatsApp.` : "We contact you on WhatsApp with the fee and payment details."],
    ["03", "Enjoy the show", `Welcome gift: ${M.welcome}.`],
  ];
  return (
    <div className={"m-steps" + (col ? " col" : "")}>
      {s.map(([n, h, p]) => <div key={n} className="m-step reveal"><span className="num">{n}</span><h3>{h}</h3><p>{p}</p></div>)}
    </div>
  );
}
