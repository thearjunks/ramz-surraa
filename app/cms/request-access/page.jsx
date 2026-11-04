import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { ROLES } from "@/lib/auth";
import { requestAccess } from "@/lib/admin-actions";
import { AuthArt } from "../login/page";

export const metadata = { title: "Request access" };
const ROLE_HINT = [["booking_staff", ROLES.booking_staff + " — handle booking requests"], ["checkin", ROLES.checkin + " — scan passes at the door"],
  ["event_manager", ROLES.event_manager + " — events & bookings"], ["finance", ROLES.finance + " — payments"], ["admin", ROLES.admin + " — full access"]];

export default function RequestAccess() {
  return (
    <div className="cms-auth">
      <AuthArt />
      <div className="panel"><div className="box" style={{ width: "min(520px,100%)" }}>
        <h1>Request access</h1>
        <p>An administrator reviews every request. You can sign in once it is approved.</p>
        <ActionForm action={requestAccess} submit="Send request" className="form two" fields={[
          { name: "name", label: "Full name", required: true, autoComplete: "name", full: true },
          { name: "username", label: "Choose a username", required: true, autoComplete: "username", placeholder: "e.g. ahmed.k" },
          { name: "mobile", label: "Mobile / WhatsApp", type: "tel", required: true, autoComplete: "tel" },
          { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", full: true },
          { name: "role", label: "What do you need to do?", type: "select", required: true, options: ROLE_HINT, full: true },
          { name: "note", label: "Your role in the team (optional)", type: "textarea", full: true },
          { name: "password", label: "Password", type: "password", required: true, autoComplete: "new-password", hint: "At least 8 characters." },
          { name: "password2", label: "Confirm password", type: "password", required: true, autoComplete: "new-password" },
        ]} />
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}><Link href="/cms/login/" className="linkish">← Back to sign in</Link></p>
      </div></div>
    </div>
  );
}
