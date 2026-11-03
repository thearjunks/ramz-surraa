import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { currentUser } from "@/lib/auth";
import { cmsNavigation } from "@/lib/cms";

export default async function SiteLayout({ children }) {
  const u = await currentUser();
  const navigation = cmsNavigation("header");
  const footerNavigation = cmsNavigation("footer");
  return (
    <>
      <Header user={u ? { name: u.name, staff: u.role !== "member" } : null} navigation={navigation} />
      <main id="main">{children}</main>
      <Footer navigation={footerNavigation} />
      <Reveal />
    </>
  );
}
