import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { currentUser, isStaff } from "@/lib/auth";
import { signIn } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Sign In | SURRAA", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  const u = await currentUser();
  if (isStaff(u)) redirect("/admin/");
  return (
    <div className="admin-login">
      <div className="card">
        <img src="/images/surraa-logo.png" alt="SURRAA" style={{ height: 44, marginBottom: 16 }} />
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>Admin sign in</h1>
        <p className="muted" style={{ marginBottom: 22 }}>SURRAA Community Association staff.</p>
        {u && !isStaff(u) && <div className="notice err" style={{ display: "block", marginBottom: 14 }}>You are signed in as a member. Sign in with a staff account.</div>}
        <ActionForm action={signIn} submit="Sign in" hidden={{ next: "/admin/" }} fields={[
          { name: "username", label: "Username", required: true, autoComplete: "username", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "current-password", full: true },
        ]} />
        <div className="admin-login-foot">
          <span className="muted">No account yet?</span>
          <Link className="btn btn-ghost" href="/admin/request-access/">Request access</Link>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>Forgot your password? Ask an administrator to reset it.</p>
      </div>
    </div>
  );
}
