import Link from "next/link";
import Icon from "@/components/Icon";
import AdminNav from "@/components/admin/AdminNav";
import { requirePerm, can, ROLES } from "@/lib/auth";
import { signOut } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | SURRAA Community Association", robots: { index: false, follow: false } };

const ITEMS = [
  ["Dashboard", "/admin/", "star", "dashboard"], ["Bookings", "/admin/bookings/", "ticket", "bookings.view"], ["Events", "/admin/events/", "cal", "events"],
  ["Content", "/admin/content/", "screen", "content"],
  ["Users & Members", "/admin/users/", "users", "users"], ["QR Check-in", "/admin/checkin/", "camera", "checkin"], ["Reports", "/admin/reports/", "sliders", "reports"],
  ["Settings", "/admin/settings/", "screen", "settings"], ["Audit Log", "/admin/audit/", "search", "audit"],
];

export default async function AdminLayout({ children }) {
  const u = await requirePerm(null);
  const items = ITEMS.filter((i) => can(u, i[3]));
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link href="/admin/" className="admin-brand"><img src="/images/surraa-logo.png" alt="" /><span>SURRAA<small>Admin</small></span></Link>
        <AdminNav items={items.map(([t, h, i]) => [t, h, i])} />
        <div className="admin-me">
          <b>{u.name}</b><small>{ROLES[u.role]}</small>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Link className="btn btn-ghost btn-sm" href="/" target="_blank"><Icon name="globe" />Site</Link>
            <form action={signOut}><button className="btn btn-ghost btn-sm">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="admin-main" id="main">{children}</main>
    </div>
  );
}
