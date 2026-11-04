import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { currentUser, isStaff } from "@/lib/auth";
import { signIn } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export function AuthArt() {
  return (
    <div className="art">
      <img src="/images/surraa-logo.png" alt="SURRAA" />
      <div>
        <h2>Community events,<br />managed simply.</h2>
        <p>The SURRAA Community Association CMS — booking requests, entry passes, door check-in and reports in one place.</p>
        <ul>
          <li><Icon name="inbox" />Review and confirm entry pass requests</li>
          <li><Icon name="ticket" />Official passes with QR codes</li>
          <li><Icon name="scan" />Fast check-in at the door</li>
          <li><Icon name="chart" />Excel, CSV and PDF reports</li>
        </ul>
      </div>
      <small style={{ color: "#6E8571" }}>© SURRAA Community Association · Kuwait</small>
    </div>
  );
}

export default async function CmsLogin() {
  const u = await currentUser();
  if (isStaff(u)) redirect("/cms/");
  return (
    <div className="cms-auth">
      <AuthArt />
      <div className="panel"><div className="box">
        <h1>Sign in</h1>
        <p>Use your CMS username and password.</p>
        {u && !isStaff(u) && <div className="notice warn" style={{ marginBottom: 14 }}>You are signed in as a website member. Sign in with a team account to use the CMS.</div>}
        <ActionForm action={signIn} submit="Sign in" hidden={{ next: "/cms/" }} fields={[
          { name: "username", label: "Username", required: true, autoComplete: "username", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "current-password", full: true },
        ]} />
        <div className="alt"><span className="muted">New to the team?</span><Link className="btn" href="/cms/request-access/">Request access</Link></div>
        <p className="muted small" style={{ marginTop: 14 }}>Forgot your password? Ask an administrator to set a new one for you.</p>
      </div></div>
    </div>
  );
}
