import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { ROLES } from "@/lib/auth";
import { requestAccess } from "@/lib/admin-actions";

export const metadata = { title: "Request Admin Access | SURRAA", robots: { index: false, follow: false } };

const ROLE_HINT = [["booking_staff", ROLES.booking_staff + " — manage booking requests"], ["checkin", ROLES.checkin + " — scan passes at the entrance"],
  ["event_manager", ROLES.event_manager + " — events & bookings"], ["finance", ROLES.finance + " — payments"], ["admin", ROLES.admin + " — full access"]];

export default function RequestAccess() {
  return (
    <div className="admin-login">
      <div className="card" style={{ width: "min(560px,100%)" }}>
        <img src="/images/surraa-logo.png" alt="SURRAA" style={{ height: 44, marginBottom: 16 }} />
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>Request access</h1>
        <p className="muted" style={{ marginBottom: 22 }}>An administrator reviews every request. You can sign in after approval.</p>
        <ActionForm action={requestAccess} submit="Send request" className="form m-form" fields={[
          { name: "name", label: "Full name", required: true, autoComplete: "name", full: true },
          { name: "username", label: "Choose a username", required: true, autoComplete: "username", placeholder: "e.g. ahmed.k" },
          { name: "mobile", label: "Mobile / WhatsApp", type: "tel", required: true, autoComplete: "tel" },
          { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", full: true },
          { name: "role", label: "Access needed", type: "select", required: true, options: ROLE_HINT, full: true },
          { name: "note", label: "Reason / your role in the team", type: "textarea", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "new-password", hint: "At least 8 characters." },
          { name: "password2", label: "Confirm password", type: "password", required: true, autoComplete: "new-password" },
        ]} />
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}><Link href="/admin/login/" style={{ color: "var(--volt)" }}>← Back to sign in</Link></p>
      </div>
    </div>
  );
}
