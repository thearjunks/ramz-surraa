import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { currentUser, isStaff } from "@/lib/auth";
import { signIn } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function CmsLogin() {
  const u = await currentUser();
  if (isStaff(u)) redirect("/cms/");
  return (
    <div className="cms-auth">
      <div className="art">
        <img src="/images/surraa-logo.png" alt="SURRAA" />
        <div>
          <h2>Your website,<br />edited in minutes.</h2>
          <p>The SURRAA website CMS — change texts, photos, artists and the gallery without touching any code.</p>
          <ul>
            <li><Icon name="home" />Home banner and page texts</li>
            <li><Icon name="mic" />Artists and line-ups</li>
            <li><Icon name="image" />Gallery and image library</li>
            <li><Icon name="gear" />Contacts, socials and sharing</li>
          </ul>
        </div>
        <small style={{ color: "#6E8571" }}>© SURRAA Community Association · Kuwait</small>
      </div>
      <div className="panel"><div className="box">
        <h1>Sign in to the CMS</h1>
        <p>Use the same team username and password as the bookings admin.</p>
        {u && !isStaff(u) && <div className="notice warn" style={{ marginBottom: 14 }}>You are signed in as a website member. Sign in with a team account.</div>}
        <ActionForm action={signIn} submit="Sign in" hidden={{ next: "/cms/" }} fields={[
          { name: "username", label: "Username", required: true, autoComplete: "username", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "current-password", full: true },
        ]} />
        <div className="alt"><span className="muted">Looking for bookings?</span><Link className="btn" href="/admin/">Bookings admin</Link></div>
        <p className="muted small" style={{ marginTop: 14 }}>Forgot your password? Ask an administrator to set a new one in the bookings admin.</p>
      </div></div>
    </div>
  );
}
