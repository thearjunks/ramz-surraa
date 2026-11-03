import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadCmsMedia, deleteCmsMedia, createCmsMediaFolder, moveCmsMedia } from "@/lib/cms-actions";

export default async function MediaAdmin({ searchParams, cms = false }) {
  await requirePerm("content");
  const sp = await searchParams;
  const folderId = Number(sp.folder) || 0;
  const folders = db.prepare("SELECT * FROM cms_media_folders ORDER BY id").all();
  const byId = Object.fromEntries(folders.map((folder) => [folder.id, folder]));
  const folderPath = (folder) => folder.parent_id && byId[folder.parent_id] ? folderPath(byId[folder.parent_id]) + " / " + folder.name : folder.name;
  const sortedFolders = [...folders].sort((a, b) => folderPath(a).localeCompare(folderPath(b)));
  const media = folderId
    ? db.prepare("SELECT * FROM cms_media WHERE folder_id=? ORDER BY id DESC LIMIT 300").all(folderId)
    : db.prepare("SELECT * FROM cms_media ORDER BY id DESC LIMIT 300").all();
  const base = cms ? "/cms/" : "/admin/content/";
  return <><Head title="Media library" sub={`${media.length} assets shown. Existing website images are indexed here with their original URLs.`}><Link className="btn btn-ghost" href={base}>← Pages</Link></Head>
    {(await searchParams).uploaded && <div className="notice ok" style={{ display: "block" }}>Media uploaded.</div>}
    {(await searchParams).deleted && <div className="notice ok" style={{ display: "block" }}>Media deleted.</div>}
    {(await searchParams).error === "inuse" && <div className="notice err" style={{ display: "block" }}>This file is used by a page, site content, or event. Replace those references first.</div>}
    {sp.error === "builtin" && <div className="notice err" style={{ display: "block" }}>Built-in website images are protected from deletion.</div>}
    {sp.error === "folder" && <div className="notice err" style={{ display: "block" }}>Choose a valid folder name and parent.</div>}
    {(sp.folder_saved || sp.moved) && <div className="notice ok" style={{ display: "block" }}>Media library updated.</div>}
    <section className="a-card" style={{ marginBottom: 18 }}><h2>Folders</h2><div className="btn-row" style={{ flexWrap: "wrap" }}>
      <Link className="btn btn-ghost btn-sm" href={base + "media/"}>All assets</Link>
      {sortedFolders.map((folder) => <Link className="btn btn-ghost btn-sm" key={folder.id} href={`${base}media/?folder=${folder.id}`}>{folderPath(folder)}</Link>)}
    </div><form action={createCmsMediaFolder} className="a-inline" style={{ marginTop: 16 }}>
      <input type="hidden" name="cms" value={cms ? "1" : "0"} />
      <input className="input" name="name" aria-label="New folder name" placeholder="New folder name" required maxLength="80" />
      <select className="input" name="parent_id" aria-label="Parent folder"><option value="">Top level</option>{sortedFolders.map((folder) => <option key={folder.id} value={folder.id}>{folderPath(folder)}</option>)}</select>
      <button className="btn btn-ghost btn-sm">Create folder</button>
    </form></section>
    <section className="a-card"><ActionForm action={uploadCmsMedia} submit="Upload media" className="form a-form3" hidden={{ cms: cms ? "1" : "0" }} fields={[
      { name: "alt_text", label: "Image description", required: true, full: true },
      { name: "folder_id", label: "Folder", type: "select", options: [["", "No folder"], ...sortedFolders.map((folder) => [String(folder.id), folderPath(folder)])], defaultValue: folderId ? String(folderId) : "", noEmpty: true },
    ]}><label className="field full">File<input className="input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></label></ActionForm></section>
    <div className="a-table-wrap" style={{ marginTop: 18 }}><table className="a-table"><thead><tr><th>Preview</th><th>File</th><th>URL to copy into a section</th><th>Folder</th><th>Actions</th></tr></thead><tbody>
      {media.map((m) => <tr key={m.id}><td>{m.mime.startsWith("image/") && <img src={m.url} alt={m.alt_text} width="80" />}</td><td>{m.filename}<br /><small>{m.origin === "built-in" ? "Existing website asset" : "Uploaded"} · {Math.ceil(m.size / 1024)} KB</small></td><td><code>{m.url}</code><br /><small>{m.alt_text}</small></td><td>{byId[m.folder_id] ? folderPath(byId[m.folder_id]) : "Unfiled"}</td><td><form action={moveCmsMedia} className="a-inline"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} />
        <select className="input" name="folder_id" aria-label={`Folder for ${m.filename}`} defaultValue={m.folder_id || ""}><option value="">Unfiled</option>{sortedFolders.map((folder) => <option key={folder.id} value={folder.id}>{folderPath(folder)}</option>)}</select><button className="btn btn-ghost btn-sm">Move</button></form>
        {m.origin !== "built-in" && <form action={deleteCmsMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} /><button className="btn btn-ghost btn-sm">Delete</button></form>}</td></tr>)}
    </tbody></table></div>
  </>;
}
