import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { signIn } from "@/lib/actions";

export const metadata = { title: "Sign In | SURRAA Community Association", ...noindex };

export default async function SignIn({ searchParams }) {
  const q = await searchParams;
  return (
    <>
      <PageHero crumb="Sign In"><h1>Sign <span className="grad">in</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap narrow"><div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
        {q.reset && <div className="notice ok" style={{ display: "block", marginBottom: 16 }}>Your password has been changed. Please sign in.</div>}
        <ActionForm action={signIn} submit="Sign in" hidden={{ next: q.next || "" }} fields={[
          { name: "email", label: "Email address", type: "email", required: true, autoComplete: "email", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "current-password", full: true },
        ]} />
        <p className="muted" style={{ marginTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <Link href="/forgot-password/" style={{ color: "var(--volt)" }}>Forgot password?</Link>
          <span>New here? <Link href={"/register/" + (q.next ? "?next=" + encodeURIComponent(q.next) : "")} style={{ color: "var(--volt)" }}>Create a free account</Link></span></p>
      </div></div></section>
    </>
  );
}
