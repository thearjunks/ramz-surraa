import Link from "next/link";
import Icon from "@/components/Icon";
import MediaUpload from "@/components/cms/MediaUpload";
import CopyPath from "@/components/cms/CopyPath";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { listMedia } from "@/lib/media";
import { deleteMedia } from "@/lib/cms-actions";
import { currentUser, can } from "@/lib/auth";

export const metadata = { title: "Image library" };
export const dynamic = "force-dynamic";
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB");

export default async function Media({ searchParams }) {
  const sp = await searchParams;
  if (!can(await currentUser(), "content")) return null; // layout handles sign-in / no access
  const all = listMedia();
  const used = JSON.stringify(getContent()) + JSON.stringify(db.prepare("SELECT poster, gallery FROM events").all());
  const view = sp.show === "uploaded" ? all.filter((m) => m.uploaded) : sp.show === "unused" ? all.filter((m) => !used.includes(m.path)) : all;
  const q = (sp.q || "").toLowerCase();
  const list = q ? view.filter((m) => m.path.toLowerCase().includes(q)) : view;
  const chip = (k, t, n) => <Link aria-current={(sp.show || "") === k ? "page" : undefined} href={"/cms/media/" + (k ? "?show=" + k : "")}>{t}&nbsp;<em>{n}</em></Link>;
  return (
    <>
      <div className="cms-head"><div><Link className="crumb" href="/cms/"><Icon name="left" />Overview</Link><h1>Image library</h1><p>Upload photos once — then pick them for the banner, artists, gallery or any page.</p></div></div>
      {sp.deleted && <div className="notice ok" style={{ marginBottom: 14 }}>Image deleted.</div>}
      <MediaUpload />
      <div className="toolbar" style={{ marginTop: 20 }}>
        <div className="chips" style={{ margin: 0 }}>{chip("", "All", all.length)}{chip("uploaded", "Uploaded here", all.filter((m) => m.uploaded).length)}{chip("unused", "Not used", all.filter((m) => !used.includes(m.path)).length)}</div>
        <form method="get" className="row" style={{ marginLeft: "auto" }}>{sp.show && <input type="hidden" name="show" value={sp.show} />}<input type="search" name="q" defaultValue={sp.q} placeholder="Search by file name" aria-label="Search images" /><button className="btn">Search</button></form>
      </div>
      <div className="media-grid">
        {list.map((m) => {
          const inUse = used.includes(m.path);
          return (
            <figure key={m.path} className="media">
              <a href={"/" + m.path} target="_blank" rel="noopener"><img src={"/" + m.path} alt="" loading="lazy" /></a>
              <figcaption>
                <b title={m.path}>{m.name}</b>
                <small>{kb(m.size)} · {m.uploaded ? "Uploaded" : "Website"}{inUse && <span className="pill up" style={{ marginLeft: 6 }}>In use</span>}</small>
                <div className="row">
                  <CopyPath text={m.path} />
                  {m.uploaded && (inUse ? <span className="muted small" title="Remove it from the pages that use it first">Used on the site</span>
                    : <form action={deleteMedia}><input type="hidden" name="path" value={m.path} /><button className="btn btn-sm btn-ghost danger-text"><Icon name="trash" />Delete</button></form>)}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {!list.length && <div className="k-empty"><b>No images here</b>Upload some photos above.</div>}
    </>
  );
}
