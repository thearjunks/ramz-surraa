import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import Editor from "@/components/cms/Editor";
import { section } from "@/lib/content-schema";
import { sectionValue, isEdited, editedAt } from "@/lib/content";
import { listMedia } from "@/lib/media";
import { resetContent } from "@/lib/cms-actions";
import { currentUser, can } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) { return { title: section((await params).section)?.title || "Edit" }; }

const when = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export default async function EditSection({ params, searchParams }) {
  const key = (await params).section;
  const sp = await searchParams;
  const s = section(key);
  if (!s) notFound();
  if (!can(await currentUser(), "content")) return null; // layout handles sign-in / no access
  const edited = isEdited(key);
  return (
    <>
      <div className="cms-head">
        <div>
          <Link className="crumb" href="/cms/"><Icon name="left" />Overview</Link>
          <h1>{s.title}</h1>
          <p>{s.desc}{s.db ? " · Changes save straight to the events." : edited ? ` · Last saved ${when(editedAt(key))}` : " · Showing the original website content"}</p>
        </div>
        {edited && <form action={resetContent} className="row">
          <input type="hidden" name="section" value={key} />
          <details className="dropdown"><summary className="btn btn-ghost"><Icon name="undo" />Restore original</summary>
            <div className="k-menu" style={{ padding: 12, width: 260 }}><p className="small" style={{ margin: "0 0 10px" }}>Remove all your changes to this section and go back to the original website content?</p><button className="btn btn-sm btn-danger" style={{ width: "100%" }}>Yes, restore original</button></div>
          </details>
        </form>}
      </div>
      {sp.reset && <div className="notice ok" style={{ marginBottom: 14 }}>Restored. This section shows the original content again.</div>}
      <Editor key={key + (sp.reset || "")} sectionKey={key} initial={sectionValue(key)} library={listMedia().map((m) => m.path)} viewUrl={s.url} />
    </>
  );
}
