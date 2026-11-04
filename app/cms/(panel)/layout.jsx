import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import Shell from "@/components/cms/Shell";
import { currentUser, isStaff, can, ROLES } from "@/lib/auth";
import { signOutCms } from "@/lib/cms-actions";
import { SECTIONS, GROUPS } from "@/lib/content-schema";

export const dynamic = "force-dynamic";
const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default async function CmsPanel({ children }) {
  const u = await currentUser();
  if (!isStaff(u)) redirect("/cms/login/");
  if (!can(u, "content")) return (
    <div className="cms-auth" style={{ gridTemplateColumns: "1fr" }}><div className="panel"><div className="box">
      <h1>No access to the website CMS</h1>
      <p>Your account ({ROLES[u.role]}) can use the bookings admin but not edit website content. Ask an administrator if you need access.</p>
      <div className="row"><Link className="btn btn-primary" href="/admin/">Go to bookings admin</Link><form action={signOutCms}><button className="btn">Sign out</button></form></div>
    </div></div></div>
  );

  const item = (s) => ({ t: s.title, h: `/cms/edit/${s.key}/`, i: s.icon });
  const groups = [
    { label: "", items: [{ t: "Overview", h: "/cms/", i: "home" }] },
    ...GROUPS.map((g) => ({
      label: g,
      items: [...(g === "Content" ? [{ t: "All website images", h: "/cms/images/", i: "camera" }] : []), ...SECTIONS.filter((s) => s.group === g).map(item),
        ...(g === "Content" ? [{ t: "Image library", h: "/cms/media/", i: "upload" }, ...(can(u, "events") ? [{ t: "Event dates & line-up", h: "/admin/events/", i: "ticket", ext: true }] : [])] : [])],
    })),
    { label: "Shortcuts", items: [{ t: "Bookings admin", h: "/admin/", i: "ticket", ext: true }, { t: "Open website", h: "/", i: "globe", ext: true }] },
  ];
  const tabs = [{ t: "Overview", h: "/cms/", i: "home" }, { t: "Home page", h: "/cms/edit/home/", i: "star" }, { t: "All images", h: "/cms/images/", i: "camera" }, { t: "Upload", h: "/cms/media/", i: "upload" }];
  const account = (
    <details className="dropdown">
      <summary className="btn" aria-label="Account menu"><span className="avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{initials(u.name)}</span><span className="hide-sm">{u.name.split(" ")[0]}</span><Icon name="down" /></summary>
      <div className="k-menu">
        <div style={{ padding: "8px 10px 10px" }}><b style={{ display: "block" }}>{u.name}</b><small className="muted">{ROLES[u.role]}</small></div>
        <hr />
        <a href="/" target="_blank" rel="noopener"><Icon name="ext" />Open the website</a>
        <a href="/admin/"><Icon name="ticket" />Bookings admin</a>
        <hr />
        <form action={signOutCms}><button><Icon name="logout" />Sign out</button></form>
      </div>
    </details>
  );
  const top = <a className="btn btn-ghost hide-sm" href="/" target="_blank" rel="noopener"><Icon name="globe" />surraa.com</a>;
  return (
    <Shell groups={groups} tabs={tabs} top={top} account={account} brand="Website CMS" me={{ name: u.name, role: ROLES[u.role], initials: initials(u.name) }}>
      {children}
    </Shell>
  );
}
