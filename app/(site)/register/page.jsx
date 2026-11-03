import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { siteContent } from "@/lib/cms-site";
import { register } from "@/lib/actions";

export const metadata = { title: "Create Account | SURRAA Community Association", ...noindex };

export default async function Register({ searchParams }) {
  const D = siteContent();
  const next = (await searchParams).next || "";
  return (
    <>
      <PageHero crumb="Register" lead="Free membership account for faster entry pass requests."><h1>Create <span className="grad">account</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap narrow"><div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
        <ActionForm action={register} submit="Create account" className="form m-form" hidden={{ next }} datalists={{ "nat-list": D.membership?.nationalities || [] }} fields={[
          { name: "name", label: "Full name", required: true, autoComplete: "name", full: true },
          { name: "mobile", label: "Mobile / WhatsApp number", type: "tel", required: true, autoComplete: "tel", placeholder: "+965 5xxx xxxx" },
          { name: "nationality", label: "Nationality", required: true, list: "nat-list", autoComplete: "off" },
          { name: "email", label: "Email address", type: "email", required: true, autoComplete: "email", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "new-password", hint: "At least 8 characters." },
          { name: "password2", label: "Confirm password", type: "password", required: true, autoComplete: "new-password" },
          { name: "consent", type: "checkbox", required: true, label: 'I accept the <a href="/terms/" target="_blank">terms</a> and <a href="/privacy/" target="_blank">privacy policy</a>. *' },
        ]} />
        <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>Already a member? <Link href="/sign-in/" style={{ color: "var(--volt)" }}>Sign in</Link></p>
      </div></div></section>
    </>
  );
}
