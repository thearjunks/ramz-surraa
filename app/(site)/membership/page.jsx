import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHero } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Membership | SURRAA Community Association Kuwait", description: "Create a free SURRAA member account: faster entry pass requests, digital membership ID and your pass history." };

const PERKS = [["ticket", "Faster entry pass requests", "Your name, mobile, nationality and Civil ID are filled in automatically."],
  ["star", "Digital membership ID", "Your personal SURRAA member number in your account."],
  ["cal", "Upcoming & past events", "All your requests, confirmations and passes in one place."],
  ["search", "Pass tracking", "Follow every request from submitted to confirmed."],
  ["users", "Member invitations", "Access to member-only events when we announce them."]];

export default async function Membership() {
  const u = await currentUser();
  return (
    <>
      <PageHero crumb="Membership" lead="Free to join. Membership does not confirm an entry pass by itself — every pass is still confirmed by our team."><h1>Become a <span className="grad">member</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap split" style={{ alignItems: "start" }}>
        <div className="pillars">{PERKS.map(([ic, h, p]) => <div key={h} className="pillar reveal"><span className="icon-disc"><Icon name={ic} /></span><div><h3>{h}</h3><p className="muted">{p}</p></div></div>)}</div>
        <div className="card cta-card">
          <span className="kicker">Free account</span>
          <h2>{u ? `Welcome, ${u.name.split(" ")[0]}` : "Join in a minute"}</h2>
          <p className="muted">{u ? `Your membership ID is ${u.membership_id}.` : "Name, mobile, email and a password — that's all."}</p>
          <div className="btn-row">{u ? <Link className="btn btn-primary" href="/account/">My account</Link>
            : <><Link className="btn btn-primary" href="/register/"><Icon name="users" />Create free account</Link><Link className="btn btn-ghost" href="/sign-in/">Sign in</Link></>}</div>
        </div>
      </div></section>
    </>
  );
}
