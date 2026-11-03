import ActionForm from "@/components/ActionForm";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { trackEntryPass } from "@/lib/actions";

export const metadata = { title: "Track Entry Pass | SURRAA Community Association", ...noindex };

export default function Track() {
  return (
    <>
      <PageHero crumb="Track Entry Pass" lead="Enter your booking reference and the email or mobile number you used."><h1>Track <span className="grad">entry pass</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 30 }}><div className="wrap narrow"><div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
        <ActionForm action={trackEntryPass} submit="Track my request" fields={[
          { name: "ref", label: "Booking reference", required: true, placeholder: "SCA-2026-000001", full: true, autoComplete: "off" },
          { name: "contact", label: "Email or mobile number", required: true, full: true, autoComplete: "email" },
        ]} />
      </div></div></section>
    </>
  );
}
