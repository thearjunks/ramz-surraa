import Link from "next/link";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { siteContent } from "@/lib/cms-site";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";
import { updateProfile, signOut, resendVerification } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account | SURRAA Community Association", ...noindex };

export default async function Account({ searchParams }) {
  const D = siteContent();
  const u = await requireUser("/account/");
  const q = await searchParams;
  const cat = u.category_id ? db.prepare("SELECT * FROM membership_categories WHERE id = ?").get(u.category_id) : null;
  return (
    <>
      <PageHero crumb="My Account"><h1>My <span className="grad">account</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap split" style={{ alignItems: "start" }}>
        <div className="stack">
          {q.welcome && <div className="m-banner"><Icon name="star" /><span><b>Welcome to SURRAA!</b> Your free member account is ready.</span></div>}
          <div className="member-card">
            <img src="/images/surraa-logo.png" alt="" />
            <small>SURRAA Community Association · Member</small>
            <b className="mid">{u.membership_id || "Staff account"}</b>
            <span className="mname">{u.name}</span>
            <span className="mmeta">{cat ? cat.name + " · " : ""}{u.membership_status === "active" ? "Active" : u.membership_status} · since {fmtDT(u.created_at).slice(0, 11)}</span>
          </div>
          {!u.email_verified && <form action={resendVerification} className="m-banner"><Icon name="mail" /><span>Please verify your email ({u.email}). {q.sent ? "Link sent — check your inbox." : <button className="linkish" type="submit">Resend link</button>}</span></form>}
          {cat?.benefits && <p className="muted">Benefits: {cat.benefits}</p>}
          <div className="btn-row">
            <Link className="btn btn-primary" href="/account/passes/"><Icon name="ticket" />My entry passes</Link>
            <form action={signOut}><button className="btn btn-ghost" type="submit">Sign out</button></form>
          </div>
        </div>
        <div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
          <h2 style={{ fontSize: 30, marginBottom: 18 }}>My profile</h2>
          <ActionForm action={updateProfile} submit="Save changes" className="form m-form" datalists={{ "nat-list": D.membership?.nationalities || [] }} fields={[
            { name: "name", label: "Full name", required: true, defaultValue: u.name, full: true },
            { name: "mobile", label: "Mobile / WhatsApp", type: "tel", required: true, defaultValue: u.mobile },
            { name: "nationality", label: "Nationality", required: true, defaultValue: u.nationality, list: "nat-list" },
            { name: "email", label: "Email (contact us to change)", defaultValue: u.email, disabled: true, full: true },
            { name: "civil", label: "Civil ID", inputMode: "numeric", maxLength: 14, full: true, placeholder: u.civil_last4 ? `Saved: •••• ${u.civil_last4} — enter a new one to replace` : "12 digits (optional — used for faster pass requests)", hint: "Stored encrypted. Visible only to authorised staff." },
            { name: "current", label: "Current password", type: "password", autoComplete: "current-password", hint: "Only to change your password." },
            { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          ]} />
        </div>
      </div></section>
    </>
  );
}
