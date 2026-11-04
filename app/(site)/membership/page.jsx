import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHero, Grad } from "@/components/ui";
import { page } from "@/lib/site";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Membership | SURRAA Community Association Kuwait", description: "Create a free SURRAA member account: faster entry pass requests, digital membership ID and your pass history." };


export default async function Membership() {
  const u = await currentUser();
  const P = page("membershipPage");
  return (
    <>
      <PageHero crumb="Membership" lead={P.lead} image={P.heroImage}><h1><Grad t={P.title} /></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap split" style={{ alignItems: "start" }}>
        <div className="pillars">{(P.perks || []).map((x, i) => <div key={i} className="pillar reveal"><span className="icon-disc"><Icon name={x.icon || "star"} /></span><div><h3>{x.title}</h3><p className="muted">{x.text}</p></div></div>)}</div>
        <div className="card cta-card">
          {P.cardKicker && <span className="kicker">{P.cardKicker}</span>}
          <h2>{u ? `Welcome, ${u.name.split(" ")[0]}` : P.cardTitle}</h2>
          <p className="muted">{u ? `Your membership ID is ${u.membership_id}.` : P.cardText}</p>
          <div className="btn-row">{u ? <Link className="btn btn-primary" href="/account/">My account</Link>
            : <><Link className="btn btn-primary" href="/register/"><Icon name="users" />Create free account</Link><Link className="btn btn-ghost" href="/sign-in/">Sign in</Link></>}</div>
        </div>
      </div></section>
    </>
  );
}
