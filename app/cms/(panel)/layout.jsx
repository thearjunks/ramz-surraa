import Link from "next/link";
import Icon from "@/components/Icon";
import Shell from "@/components/cms/Shell";
import { initials } from "@/components/cms/ui";
import { db } from "@/lib/db";
import { requirePerm, can, ROLES } from "@/lib/auth";
import { signOutCms } from "@/lib/actions";

export const dynamic = "force-dynamic";

// Navigation grouped by task. Each item: [title, href, icon, permission]
const GROUPS = [
  { label: "", items: [["Home", "/cms/", "home", "dashboard"]] },
  { label: "Bookings", items: [["Booking requests", "/cms/bookings/", "inbox", "bookings.view"], ["Payments", "/cms/payments/", "card", "payments"], ["Door check-in", "/cms/checkin/", "scan", "checkin"]] },
  { label: "Events", items: [["Events", "/cms/events/", "cal", "events"]] },
  { label: "People", items: [["Members & staff", "/cms/users/", "users", "users"]] },
  { label: "Insights", items: [["Reports & exports", "/cms/reports/", "chart", "reports"], ["Activity log", "/cms/audit/", "activity", "audit"]] },
  { label: "System", items: [["Settings", "/cms/settings/", "gear", "settings"]] },
];

export default async function PanelLayout({ children }) {
  const u = await requirePerm(null);
  const pendingReq = db.prepare("SELECT COUNT(*) n FROM bookings WHERE status IN ('pending','under_review','contacted','awaiting')").get().n;
  const access = db.prepare("SELECT COUNT(*) n FROM users WHERE account_status = 'pending'").get().n;
  const counts = { "/cms/bookings/": pendingReq, "/cms/users/": access };
  const groups = GROUPS.map((g) => ({ label: g.label, items: g.items.filter((i) => can(u, i[3])).map(([t, h, i]) => ({ t, h, i, count: counts[h] || 0 })) })).filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const tabs = ["/cms/", "/cms/bookings/", "/cms/checkin/", "/cms/events/"].map((h) => flat.find((x) => x.h === h)).filter(Boolean)
    .map((x) => ({ ...x, t: { "/cms/": "Home", "/cms/bookings/": "Bookings", "/cms/checkin/": "Check-in", "/cms/events/": "Events" }[x.h] }));
  const account = (
    <details className="dropdown">
      <summary className="btn" aria-label="Account menu"><span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{initials(u.name)}</span><span className="hide-sm">{u.name.split(" ")[0]}</span><Icon name="down" /></summary>
      <div className="k-menu">
        <div style={{ padding: "8px 10px 10px" }}><b style={{ display: "block" }}>{u.name}</b><small className="muted">{ROLES[u.role]}</small></div>
        <hr />
        {can(u, "users") && <Link href={`/cms/users/${u.id}/`}><Icon name="user" />My account & password</Link>}
        <a href="/" target="_blank" rel="noopener"><Icon name="ext" />Open the website</a>
        <hr />
        <form action={signOutCms}><button><Icon name="logout" />Sign out</button></form>
      </div>
    </details>
  );
  return (
    <Shell groups={groups} tabs={tabs} me={{ name: u.name, role: ROLES[u.role], initials: initials(u.name) }} account={account}>
      {children}
    </Shell>
  );
}
