import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { forgotPassword } from "@/lib/actions";

export const metadata = { title: "Forgot Password | SURRAA Community Association", ...noindex };

export default function Forgot() {
  return (
    <>
      <PageHero crumb="Forgot password" lead="We'll email you a link to choose a new password."><h1>Forgot <span className="grad">password</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap narrow"><div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
        <ActionForm action={forgotPassword} submit="Send reset link" fields={[{ name: "email", label: "Email address", type: "email", required: true, autoComplete: "email", full: true }]} />
      </div></div></section>
    </>
  );
}
