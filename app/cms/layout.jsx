import Link from "next/link";
import { redirect } from "next/navigation";
import StudioNav from "@/components/admin/StudioNav";
import { currentUser, can, isStaff, ROLES } from "@/lib/auth";
import { signOut } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "CMS | SURRAA", robots: { index: false, follow: false } };

export default async function CmsLayout({ children }) {
  const user = await currentUser();
  if (!isStaff(user)) redirect("/admin/login/?next=/cms/");
  if (!can(user, "content")) redirect("/admin/?denied=1");
  return <div className="admin cms-workspace">
    <aside className="admin-side">
      <Link href="/cms/" className="admin-brand"><img src="/images/surraa-logo.png" alt="" /><span>SURRAA<small>Content studio</small></span></Link>
      <StudioNav />
      <div className="admin-me"><b>{user.name}</b><small>{ROLES[user.role]}</small>
        <div className="btn-row" style={{ marginTop: 10 }}><Link className="btn btn-ghost btn-sm" href="/" target="_blank">View site</Link><form action={signOut}><button className="btn btn-ghost btn-sm">Sign out</button></form></div>
      </div>
    </aside>
    <main className="admin-main" id="main"><div className="cms-topline"><span>SURRAA / Content studio</span></div>{children}</main>
  </div>;
}
