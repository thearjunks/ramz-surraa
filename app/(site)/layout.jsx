import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { currentUser } from "@/lib/auth";
import { cmsNavigation } from "@/lib/cms";
import { siteContent } from "@/lib/cms-site";
import { globalContent } from "@/lib/global-content";
import { SiteContentProvider } from "@/components/SiteContentProvider";

export default async function SiteLayout({ children }) {
  const u = await currentUser();
  const navigation = cmsNavigation("header");
  const footerNavigation = cmsNavigation("footer");
  const content = siteContent();
  const headerContent = globalContent("header");
  const footerContent = globalContent("footer");
  return (
    <SiteContentProvider value={content}>
      <Header user={u ? { name: u.name, staff: u.role !== "member", contentOnly: ["editor", "content_manager"].includes(u.role) } : null} navigation={navigation} logo={headerContent.logo} brandLabel={headerContent.label} />
      <main id="main">{children}</main>
      <Footer navigation={footerNavigation} content={footerContent} />
      <Reveal />
    </SiteContentProvider>
  );
}
