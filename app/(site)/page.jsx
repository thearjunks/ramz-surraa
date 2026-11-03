import HomeSections from "@/components/HomeSections";
import CmsPageExtras from "@/components/CmsPageExtras";
import { siteContent } from "@/lib/cms-site";
import { homeVersions } from "@/lib/home-cms";
import { publicEvents, view } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export function HomeView({ sections, preview = false }) {
  const site = siteContent();
  const event = publicEvents().map(view)[0];
  const C = site.company;
  const jsonLd = { "@context": "https://schema.org", "@type": "Organization", name: C.name, url: C.website,
    logo: C.website + "/images/surraa-logo.png", email: C.email, telephone: C.phone,
    address: { "@type": "PostalAddress", addressCountry: "KW" } };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />
    <HomeSections sections={sections} site={site} event={event} />
    <CmsPageExtras slug="home" preview={preview} />
  </>;
}

export default function Home() {
  return <HomeView sections={homeVersions().published} />;
}
