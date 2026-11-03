import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import CmsNavigation from "@/components/admin/CmsNavigation";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db, setting } from "@/lib/db";
import { DEFAULT_NAV } from "@/lib/cms";
import { saveCmsNavigation } from "@/lib/cms-actions";

export default async function NavigationAdmin({ searchParams }) {
  await requirePerm("content");
  const rows = db.prepare("SELECT label, href, location, is_visible FROM cms_navigation ORDER BY sort_order, id").all();
  const initial = setting("cms_navigation_configured") === "1" ? rows.map((r) => ({ label: r.label, href: r.href, location: r.location, visible: !!r.is_visible })) : DEFAULT_NAV.map(([label, href]) => ({ label, href, location: "header", visible: true }));
  return <><Head title="Navigation" sub="Manage header and footer links."><Link className="btn btn-ghost" href="/admin/content/">← Content</Link></Head>
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Navigation saved.</div>}
    <section className="a-card"><ActionForm action={saveCmsNavigation} submit="Save navigation" className="form a-form3" fields={[]}><CmsNavigation initial={initial} /></ActionForm></section>
  </>;
}
