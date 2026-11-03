import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { resetPassword } from "@/lib/actions";

export const metadata = { title: "Reset Password | SURRAA Community Association", ...noindex };

export default async function Reset({ searchParams }) {
  const t = (await searchParams).t || "";
  return (
    <>
      <PageHero crumb="Reset password"><h1>New <span className="grad">password</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap narrow"><div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
        <ActionForm action={resetPassword} submit="Save new password" hidden={{ t }} fields={[
          { name: "password", label: "New password", type: "password", required: true, autoComplete: "new-password", full: true, hint: "At least 8 characters." },
          { name: "password2", label: "Confirm new password", type: "password", required: true, autoComplete: "new-password", full: true },
        ]} />
      </div></div></section>
    </>
  );
}
