import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm, ROLES } from "@/lib/auth";
import { saveUser } from "@/lib/admin-actions";

export const metadata = { title: "Person" };
const HINT = { super_admin: "Everything", admin: "Everything except Super Admins", event_manager: "Events, bookings & confirmations", booking_staff: "Bookings, no confirmations", finance: "Payments", checkin: "Door check-in only", member: "Website member — no CMS access" };

export default async function PersonEdit({ params, searchParams }) {
  const me = await requirePerm("users");
  const id = (await params).id;
  const sp = await searchParams;
  const x = id === "new" ? null : db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
  const cats = db.prepare("SELECT id, name FROM membership_categories ORDER BY id").all();
  const d = x || { role: sp.type === "member" ? "member" : "booking_staff", membership_status: "active", account_status: "active" };
  const isMember = d.role === "member";
  const roles = Object.entries(ROLES).filter(([k]) => k !== "super_admin" || me.role === "super_admin" || d.role === "super_admin").map(([k, v]) => [k, `${v} — ${HINT[k]}`]);
  return (
    <>
      <Head title={x ? x.name : isMember ? "Add member" : "Add team member"} back={["/cms/users/?tab=" + (isMember ? "members" : "staff"), "Members & staff"]}
        sub={x ? [x.username && "@" + x.username, x.membership_id, ROLES[x.role]].filter(Boolean).join(" · ") : isMember ? "Creates a website account with a membership ID." : "Team members sign in at /cms/login with their username."} />
      {x?.id === me.id && <div className="notice info" style={{ marginBottom: 14 }}>This is your own account. Set a new password below to change it.</div>}
      <section className="k-card" style={{ maxWidth: 860 }}>
        <ActionForm action={saveUser} submit={x ? "Save changes" : "Create account"} hidden={{ id: x?.id || "" }} fields={[
          { type: "section", num: 1, label: "Personal details" },
          { name: "name", label: "Full name", required: true, defaultValue: d.name, full: true },
          { name: "email", label: "Email", type: "email", required: true, defaultValue: d.email },
          { name: "mobile", label: "Mobile", type: "tel", required: true, defaultValue: d.mobile, placeholder: "+965…" },
          { name: "nationality", label: "Nationality", defaultValue: d.nationality },
          { type: "section", num: 2, label: "Access", hint: "Choose what this person can do in the CMS." },
          { name: "role", label: "Access level", type: "select", noEmpty: true, options: roles, defaultValue: d.role, full: true },
          { name: "username", label: "Username (for signing in to the CMS)", defaultValue: d.username, autoComplete: "off", hint: "Required for team members. Letters, numbers, dots." },
          { name: "account_status", label: "Account", type: "select", noEmpty: true, options: [["active", "Active — can sign in"], ["disabled", "Disabled — cannot sign in"]], defaultValue: d.account_status },
          { type: "section", num: 3, label: "Membership", hint: "Only matters for community members." },
          { name: "category_id", label: "Membership type", type: "select", options: cats.map((c) => [String(c.id), c.name]), defaultValue: d.category_id ? String(d.category_id) : "" },
          { name: "membership_status", label: "Membership status", type: "select", noEmpty: true, options: [["active", "Active"], ["suspended", "Suspended"], ["expired", "Expired"]], defaultValue: d.membership_status },
          { type: "section", num: 4, label: x ? "Change password" : "Password", hint: x ? "Leave empty to keep the current password." : "At least 8 characters. Share it with the person privately." },
          { name: "password", label: x ? "New password" : "Password", type: "password", autoComplete: "new-password", required: !x },
        ]} />
      </section>
    </>
  );
}
