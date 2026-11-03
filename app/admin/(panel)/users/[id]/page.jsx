import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm, ROLES } from "@/lib/auth";
import { saveUser } from "@/lib/admin-actions";

export default async function UserEdit({ params }) {
  const me = await requirePerm("users");
  const id = (await params).id;
  const x = id === "new" ? null : db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
  const cats = db.prepare("SELECT id, name FROM membership_categories ORDER BY id").all();
  const d = x || { role: "booking_staff", membership_status: "active", account_status: "active" };
  return (
    <>
      <Head title={x ? x.name : "Add user / staff"} sub={x ? `${x.username ? "@" + x.username + " · " : ""}${x.membership_id || ROLES[x.role]} · ${x.email}` : "Staff sign in at /admin/login with their username."}><Link className="btn btn-ghost" href="/admin/users/">← Users</Link></Head>
      <section className="a-card" style={{ maxWidth: 820 }}>
        <ActionForm action={saveUser} submit="Save" className="form m-form" hidden={{ id: x?.id || "" }} fields={[
          { name: "name", label: "Full name", required: true, defaultValue: d.name, full: true },
          { name: "username", label: "Username (staff sign-in)", defaultValue: d.username, autoComplete: "off", hint: "Required for staff accounts." },
          { name: "email", label: "Email", type: "email", required: true, defaultValue: d.email },
          { name: "mobile", label: "Mobile", type: "tel", required: true, defaultValue: d.mobile },
          { name: "nationality", label: "Nationality", defaultValue: d.nationality },
          { name: "role", label: "Role", type: "select", noEmpty: true, options: Object.entries(ROLES).filter(([k]) => k !== "super_admin" || me.role === "super_admin" || d.role === "super_admin"), defaultValue: d.role,
            hint: "Super Admin & Admin: everything (only a Super Admin can manage Super Admins) · Admin: everything · Event Manager: events & bookings · Booking Staff: bookings · Finance: payments · Entry Verification: QR check-in only" },
          { name: "category_id", label: "Membership category", type: "select", options: cats.map((c) => [String(c.id), c.name]), defaultValue: d.category_id ? String(d.category_id) : "" },
          { name: "membership_status", label: "Membership status", type: "select", noEmpty: true, options: [["active", "Active"], ["suspended", "Suspended"], ["expired", "Expired"]], defaultValue: d.membership_status },
          { name: "account_status", label: "Account status", type: "select", noEmpty: true, options: [["active", "Active"], ["disabled", "Disabled"]], defaultValue: d.account_status },
          { name: "password", label: x ? "New password (leave empty to keep)" : "Password", type: "password", autoComplete: "new-password", required: !x, hint: "At least 8 characters." },
        ]} />
      </section>
    </>
  );
}
