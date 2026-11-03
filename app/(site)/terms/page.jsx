import { PageHero } from "@/components/ui";
import { DEFAULT_TERMS } from "@/lib/db";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";

export function generateMetadata() { const page = cmsPage("terms"); return page ? cmsMetadata(page) : { title: "Terms & Conditions | SURRAA Community Association", description: "Terms for entry pass requests and use of this website." }; }

export default function Terms() {
  const page = cmsPage("terms");
  if (page) return <CmsPage page={page} />;
  return (
    <>
      <PageHero crumb="Terms"><h1>Terms & conditions</h1></PageHero>
      <section className="section"><div className="wrap prose">
        <p><em>Template — please review with your legal adviser before publishing.</em></p>
        <h2>Entry passes</h2><p>{DEFAULT_TERMS}</p>
        <p>Submitting a request does not guarantee admission. Requests are confirmed by SURRAA Community Association at its discretion and may be declined, cancelled or expire. Each event may have additional terms shown on its page.</p>
        <h2>Your account</h2><p>Keep your password private. You are responsible for requests made from your account. We may suspend accounts that misuse the service.</p>
        <h2>Event information</h2><p>Line-ups, times and venues may change. The latest information is published on this website.</p>
        <h2>Contact</h2><p><a href="mailto:info@surraa.com">info@surraa.com</a></p>
      </div></section>
    </>
  );
}
