import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { currentUser } from "@/lib/auth";
import { cmsNavigation } from "@/lib/cms";
import { siteContent } from "@/lib/cms-site";
import { SiteContentProvider } from "@/components/SiteContentProvider";

export default async function SiteLayout({ children }) {
  const u = await currentUser();
  const navigation = cmsNavigation("header");
  const footerNavigation = cmsNavigation("footer");
  const content = siteContent();
  return (
    <SiteContentProvider value={content}>
      <Header user={u ? { name: u.name, staff: u.role !== "member" } : null} navigation={navigation} logo={content.company.logo} />
      <main id="main">{children}</main>
      <Footer navigation={footerNavigation} />
      <Reveal />
    </SiteContentProvider>
  );
}
