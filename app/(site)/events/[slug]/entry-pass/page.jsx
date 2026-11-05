import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { Crumbs } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { src } from "@/lib/site";
import { siteContent } from "@/lib/cms-site";
import { currentUser, siteUrl } from "@/lib/auth";
import { getEvent, view, eventStats } from "@/lib/bookings";
import { requestEntryPass } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request Entry Pass | SURRAA Community Association", ...noindex };

export default async function RequestPass({ params }) {
  const raw = getEvent((await params).slug);
  if (!raw || raw.status === "draft" || raw.is_hidden) notFound();
  const e = view(raw);
  const user = await currentUser();
  const max = Math.max(1, Math.min(e.max_per_booking, eventStats(e.id).available));
  const M = siteContent().membership || {};

  const fields = [
    { name: "personal_section", type: "section", step: "01", label: "Personal details", hint: "Enter your details exactly as they should appear on the request." },
    { name: "name", label: "Full name", required: true, autoComplete: "name", full: true, defaultValue: user?.name },
    { name: "mobile", label: "Mobile / WhatsApp number", type: "tel", required: true, autoComplete: "tel", placeholder: "+965 5xxx xxxx", defaultValue: user?.mobile },
    { name: "email", label: "Email address", type: "email", required: true, autoComplete: "email", defaultValue: user?.email },
    { name: "nationality", label: "Nationality", required: true, list: "nat-list", autoComplete: "off", defaultValue: user?.nationality },
    user?.civil_enc
      ? { name: "civil", label: "Civil ID number", inputMode: "numeric", maxLength: 14, placeholder: `Saved: •••• ${user.civil_last4} — leave blank to use it`, hint: "Your saved Civil ID is used unless you enter a different one." }
      : { name: "civil", label: "Civil ID number (optional)", inputMode: "numeric", maxLength: 14, placeholder: "12 digits", hint: "Optional. If provided, it is stored encrypted and never shown on passes or QR codes." },
    { name: "address_section", type: "section", step: "02", label: "Where you live", hint: "Choose your Kuwait governorate." },
    { name: "governorate", label: "Governorate", type: "select", required: true, options: [
      ["Al Asimah", "Al Asimah"], ["Al Farwaniya", "Al Farwaniya"], ["Hawalli", "Hawalli"],
      ["Al Ahmadi", "Al Ahmadi"], ["Al Jahra", "Al Jahra"], ["Mubarak Al Kabeer", "Mubarak Al Kabeer"],
    ], full: true },
    { name: "request_section", type: "section", step: "03", label: "Your request", hint: "Choose how many entry passes you need." },
    { name: "quantity", label: "Number of entry passes", type: "select", required: true, noEmpty: true, options: Array.from({ length: max }, (_, i) => [String(i + 1), String(i + 1)]) },
    { name: "pass_holders", type: "pass_holders" },
    ...(user && !user.civil_enc ? [{ name: "save_civil", type: "checkbox", label: "Save my Civil ID to my member profile for faster requests" }] : []),
    { name: "terms", type: "checkbox", required: true, label: 'I accept the <a href="#terms">event terms</a> and the <a href="/privacy/" target="_blank">privacy policy</a>, and understand this is a request, not an entry pass. *' },
  ];

  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 30 }}><div className="wrap">
        <Crumbs items={[["Events", "/events/"], [e.title, `/events/${e.slug}/`], ["Entry pass"]]} />
        <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>Get <span className="sun">entry pass</span></h1>
      </div></section>
      <section className="section entry-pass-section"><div className="wrap entry-pass-layout">
        <main className="entry-pass-main">
          {!user && <div className="m-banner entry-choice"><Icon name="users" /><div><span><b>Already a member?</b> Sign in to fill your details automatically, or continue as a guest.</span>
            <div className="entry-choice-actions"><Link className="btn btn-primary" href={`/sign-in/?next=/events/${e.slug}/entry-pass/`}>Member sign in</Link><a className="btn btn-ghost" href="#entry-request">Continue as guest</a></div></div></div>}
          {user && <div className="m-banner"><Icon name="star" /><span>Signed in as <b>{user.name}</b> · Member {user.membership_id}. Your details are filled in — check them before sending.</span></div>}
          <div className="card entry-request-card" id="entry-request">
            {!e.state.open ? (
              <div className="empty" style={{ padding: 0 }}><h3>{e.stateLabel}</h3><p>{e.availability || "Entry pass requests for this event are not open right now."}</p></div>
            ) : e.members_only && !user ? (
              <div className="empty" style={{ padding: 0 }}><h3>Members only</h3><p>Please sign in or create a free account to request a pass for this event.</p>
                <div className="btn-row" style={{ justifyContent: "center" }}><Link className="btn btn-primary" href={`/sign-in/?next=/events/${e.slug}/entry-pass/`}>Sign in</Link><Link className="btn btn-ghost" href="/register/">Create account</Link></div></div>
            ) : (
              <>
                <div className="entry-request-head"><span className="kicker">Entry pass request</span><h2>Your details</h2><p>Complete the form below and receive your booking reference immediately.</p></div>
                <ActionForm action={requestEntryPass} fields={fields} submit="Submit request" className="form m-form entry-request-form"
                  hidden={{ event_id: e.id, page_url: `${await siteUrl()}/events/${e.slug}/` }} datalists={{ "nat-list": M.nationalities || [] }} />
              </>
            )}
          </div>
        </main>
        <aside className="stack entry-pass-aside">
          <div className="card ev-summary">
            {e.poster && <img src={src(e.poster)} alt="" />}
            <div><span className="kicker">{e.event_code}</span><h3>{e.title}</h3>
              <p className="muted">{e.dateLabel}{e.timeLabel ? " · " + e.timeLabel : ""}<br />{e.venue}, {e.area}</p></div>
          </div>
          <ul className="m-facts">
            <li><Icon name="clock" /><span><small>Step 1</small>Send your request — you get a booking reference straight away.</span></li>
            <li><Icon name="phone" /><span><small>Step 2</small>Our team reviews it and contacts you.</span></li>
            <li><Icon name="ticket" /><span><small>Step 3</small>Once confirmed, download your official pass with QR code.</span></li>
          </ul>
          <div className="faq" id="terms"><details><summary>Event terms & conditions</summary><p style={{ whiteSpace: "pre-line" }}>{e.terms}</p></details></div>
        </aside>
      </div></section>
    </>
  );
}
