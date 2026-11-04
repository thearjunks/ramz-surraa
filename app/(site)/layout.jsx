import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SiteData from "@/components/SiteData";
import { currentUser } from "@/lib/auth";
import "@/lib/content";
import { C, M, page } from "@/lib/site";
import AnalyticsTracker from "@/components/AnalyticsTracker";

export const dynamic = "force-dynamic"; // content can change any time from the CMS

export default async function SiteLayout({ children }) {
  const u = await currentUser();
  return (
    <SiteData value={{ company: { ...C }, membership: { ...M }, pages: { branding: page("branding") } }}>
      <Header user={u ? { name: u.name, staff: u.role !== "member" } : null} />
      <main id="main">{children}</main>
      <Footer />
      <Reveal />
      <AnalyticsTracker />
    </SiteData>
  );
}
