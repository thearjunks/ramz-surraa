import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { currentUser } from "@/lib/auth";

export default async function SiteLayout({ children }) {
  const u = await currentUser();
  return (
    <>
      <Header user={u ? { name: u.name, staff: u.role !== "member" } : null} />
      <main id="main">{children}</main>
      <Footer />
      <Reveal />
    </>
  );
}
