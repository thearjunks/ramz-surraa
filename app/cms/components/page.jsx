import Link from "next/link";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { sectionCatalog } from "@/lib/section-catalog";
import { deleteCmsComponent } from "@/lib/cms-actions";
import { ConfirmButton } from "@/components/admin/Client";

export default async function Components({ searchParams }) {
  await requirePerm("content");
  const q = String((await searchParams)?.q || "").trim().toLowerCase();
  const rows = db.prepare("SELECT id, name, status, updated_at FROM cms_components ORDER BY name").all().filter((r) => !q || r.name.toLowerCase().includes(q));
  const pages = db.prepare("SELECT title,sections FROM cms_pages").all();
  const routes = db.prepare("SELECT slug,sections FROM cms_route_sections").all();
  const usedOn = (id, source) => [...pages.map((p) => [p.title, p.sections]), ...routes.map((r) => [r.slug, r.sections])]
    .filter(([, sections]) => { try { return JSON.parse(sections).some((s) => source ? s.type === "shared-section" && s.source === source : s.type === "component" && Number(s.componentId) === id); } catch { return false; } })
    .map(([name]) => name);
  return <>
    <Head title="Components" sub="Built-in page sections and reusable CMS components."><Link className="btn btn-primary" href="/cms/components/new/">New reusable component</Link></Head>
    <form method="get" className="a-inline" style={{ marginBottom: 18 }}><input className="input" name="q" defaultValue={q} placeholder="Search components" aria-label="Search components" /><button className="btn btn-ghost btn-sm">Search</button></form>
    <section className="a-card" style={{ marginBottom: 20 }}><h2>Website sections</h2><p className="muted">Choose Shared page section when adding a block to reuse one of these sections. Publishing its source updates each placement.</p>
      <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Section</th><th>Used on</th><th>Action</th></tr></thead><tbody>
        {sectionCatalog().filter((s) => !q || (s.page + " " + s.name).toLowerCase().includes(q)).map((s) => <tr key={s.value}><td>{s.name}{!s.visible && " · Hidden"}</td><td>{[...new Set([s.page, ...usedOn(null,s.value)])].join(", ")}</td><td><Link href={s.editor}>Edit source section</Link></td></tr>)}
      </tbody></table></div></section>
    <h2>Reusable CMS components</h2>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Name</th><th>Status</th><th>Used on</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.status}</td><td>{usedOn(row.id).join(", ") || "Not placed yet"}</td><td>{new Date(row.updated_at).toLocaleString("en-GB")}</td><td><Link href={`/cms/components/${row.id}/`}>Edit</Link>{!usedOn(row.id).length && <form action={deleteCmsComponent}><input type="hidden" name="id" value={row.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={`Delete ${row.name}?`}>Delete</ConfirmButton></form>}</td></tr>)}
      {!rows.length && <tr><td colSpan="5">No reusable CMS components yet. The built-in website sections are listed above.</td></tr>}
    </tbody></table></div>
  </>;
}
