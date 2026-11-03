import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import CmsNavigation from "@/components/admin/CmsNavigation";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { navigationItems } from "@/lib/cms";
import { saveCmsNavigation } from "@/lib/cms-actions";

export default async function NavigationAdmin({ searchParams, cms = false }) {
  await requirePerm("content");
  const initial = navigationItems(true);
  return <><Head title="Navigation" sub="Manage header and footer menus, dropdowns and nested links."><Link className="btn btn-ghost" href={cms ? "/cms/" : "/admin/content/"}>← Content manager</Link><Link href="/global-preview/navigation/" className="btn btn-ghost" target="_blank">Preview saved menu</Link></Head>
    {(await searchParams).draft && <p className="notice ok" style={{display:"block"}}>Menu draft saved.</p>}
    {(await searchParams).saved && <div className="notice ok" style={{ display: "block" }}>Navigation saved.</div>}
    <section className="a-card"><ActionForm action={saveCmsNavigation} submit="Save navigation" className="form a-form3" hidden={{ cms: cms ? "1" : "0" }} fields={[{ name:"intent", label:"Save action", type:"select", noEmpty:true, defaultValue:"draft", options:[["draft","Save draft"],["publish","Publish menu"]] }]}><CmsNavigation initial={initial} /></ActionForm></section>
  </>;
}
