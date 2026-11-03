import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadCmsMedia, createCmsMediaFolder, renameCmsMediaFolder } from "@/lib/cms-actions";
import { moveMediaFolder, deleteEmptyMediaFolder } from "@/lib/media-folder-actions";
import MediaFileTable from "@/components/admin/MediaFileTable";
import { ConfirmButton } from "@/components/admin/Client";

export default async function MediaAdmin({ searchParams, cms = false }) {
  await requirePerm("content");
  const sp = await searchParams || {};
  const base = cms ? "/cms/media/" : "/admin/content/media/";
  const folders = db.prepare("SELECT id,name,parent_id FROM cms_media_folders ORDER BY name").all();
  const byId = Object.fromEntries(folders.map((f) => [f.id, f]));
  const folderId = byId[Number(sp.folder)] ? Number(sp.folder) : 0;
  const q = String(sp.q || "").trim().slice(0, 100);
  const all = sp.all === "1";
  const sortOptions = { newest: "id DESC", oldest: "id ASC", name: "filename COLLATE NOCASE ASC,id DESC", size: "size DESC,id DESC" };
  const sort = Object.hasOwn(sortOptions, sp.sort) ? sp.sort : "newest";
  const page = Math.max(1, Number.parseInt(sp.page, 10) || 1), pageSize = 60;
  const folderLabel = (id) => {
    const names = [], seen = new Set();
    for (let current = id; current && byId[current] && !seen.has(current); current = byId[current].parent_id) {
      seen.add(current); names.unshift(byId[current].name);
    }
    return names.join(" / ") || "Unfiled";
  };
  const folderOptions = folders.map((f) => ({ id: f.id, label: folderLabel(f.id) })).sort((a, b) => a.label.localeCompare(b.label));
  const path = [];
  for (let id = folderId, seen = new Set(); id && !seen.has(id); id = byId[id]?.parent_id) {
    seen.add(id); if (byId[id]) path.unshift(byId[id]);
  }
  const children = q ? folders.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    : all ? [] : folders.filter((f) => (f.parent_id || 0) === folderId);
  const where = q ? "WHERE filename LIKE ? OR alt_text LIKE ?" : all ? "" : folderId ? "WHERE folder_id=?" : "WHERE folder_id IS NULL";
  const values = q ? [`%${q}%`, `%${q}%`] : !all && folderId ? [folderId] : [];
  const total = db.prepare(`SELECT COUNT(*) n FROM cms_media ${where}`).get(...values).n;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const media = db.prepare(`SELECT * FROM cms_media ${where} ORDER BY ${sortOptions[sort]} LIMIT ? OFFSET ?`).all(...values, pageSize, (currentPage - 1) * pageSize)
    .map((m) => ({ ...m, createdDate: new Date(m.created_at).toLocaleDateString("en-GB") }));
  const pageUrl = (number) => `${base}?${new URLSearchParams({ folder: String(folderId || ""), all: all ? "1" : "", q, sort, page: String(number) })}`;
  const destinationFolders = folderOptions.filter((f) => {
    const seen = new Set();
    for (let id = f.id; id && !seen.has(id); id = byId[id]?.parent_id) { if (id === folderId) return false; seen.add(id); }
    return true;
  });
  return <>
    <Head title="Media library" sub="Browse folders, search assets, upload files and organise existing website images.">
      <Link className="btn btn-ghost" href={cms ? "/cms/" : "/admin/content/"}>← Content manager</Link>
    </Head>
    {sp.uploaded && <div className="notice ok" style={{ display: "block" }}>Media uploaded.</div>}
    {(sp.folder_saved || sp.moved || sp.details_saved) && <div className="notice ok" style={{ display: "block" }}>Media library updated.</div>}
    {sp.error && <div className="notice err" style={{ display: "block" }}>{sp.error === "notempty" ? "Move files and subfolders out before deleting this folder." : sp.error === "inuse" ? "This file is used by a page or component." : sp.error === "builtin" ? "Built-in website images cannot be deleted." : sp.error === "selection" ? "Select at least one file." : sp.error === "cycle" ? "A folder cannot be moved inside itself or its own subfolder." : sp.error === "duplicate" ? "The destination already contains a folder with this name." : "Check the folder or file details."}</div>}
    <div className="a-card" style={{ marginBottom: 18 }}>
      <nav className="btn-row" aria-label="Media folder path"><Link href={base}>Media Library</Link>{path.map((f) => <span key={f.id}> / <Link href={`${base}?folder=${f.id}`}>{f.name}</Link></span>)}</nav>
      <form method="get" action={base} className="a-inline" style={{ marginTop: 16 }}><input type="hidden" name="folder" value={folderId || ""} /><input type="hidden" name="all" value={all ? "1" : ""} /><input className="input" name="q" defaultValue={q} placeholder="Search files and folders" aria-label="Search files and folders" />
        <select className="input" name="sort" defaultValue={sort} aria-label="Sort files"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="size">Largest first</option></select><button className="btn btn-ghost btn-sm">Apply</button>
        {q && <Link className="btn btn-ghost btn-sm" href={base}>Clear</Link>}</form>
      <div className="btn-row" style={{ marginTop: 14 }}><Link className="btn btn-ghost btn-sm" href={`${base}?all=1`}>All assets</Link><Link className="btn btn-ghost btn-sm" href={base}>Root folders</Link></div>
    </div>
    {!all && !q && <div className="a-card" style={{ marginBottom: 18 }}>
      <h2>{folderId ? `Inside ${byId[folderId].name}` : "Root folders"}</h2>
      <form action={createCmsMediaFolder} className="a-inline"><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="parent_id" value={folderId || ""} />
        <input className="input" name="name" aria-label="New folder name" placeholder="New folder name" maxLength="80" required /><button className="btn btn-ghost btn-sm">Create folder</button></form>
      {folderId > 0 && <div className="a-inline" style={{ marginTop: 12 }}><form action={renameCmsMediaFolder} className="a-inline"><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="id" value={folderId} />
        <input className="input" name="name" defaultValue={byId[folderId].name} aria-label="Rename current folder" required /><button className="btn btn-ghost btn-sm">Rename folder</button></form>
        <form action={deleteEmptyMediaFolder}><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="id" value={folderId} /><ConfirmButton className="btn btn-ghost btn-sm" message="Delete this empty folder?">Delete empty folder</ConfirmButton></form></div>}
      {folderId > 0 && <form action={moveMediaFolder} className="a-inline" style={{ marginTop: 12 }}><input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="id" value={folderId} />
        <select className="input" name="parent_id" defaultValue={byId[folderId].parent_id || ""} aria-label="Move current folder into"><option value="">Media Library root</option>{destinationFolders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select><button className="btn btn-ghost btn-sm">Move folder</button></form>}
    </div>}
    {!!children.length && <div className="a-card" style={{ marginBottom: 18 }}><h2>Folders</h2><div className="btn-row" style={{ flexWrap: "wrap" }}>
      {children.map((f) => <Link className="btn btn-ghost" href={`${base}?folder=${f.id}`} key={f.id}>📁 {q ? folderLabel(f.id) : f.name}</Link>)}
    </div></div>}
    <div className="a-card" style={{ marginBottom: 18 }}><ActionForm action={uploadCmsMedia} submit="Upload media" className="form a-form3" hidden={{ cms: cms ? "1" : "0" }} fields={[
      { name: "alt_text", label: "Description", required: true, full: true },
      { name: "folder_id", label: "Folder", type: "select", noEmpty: true, defaultValue: String(folderId || ""), options: [["", "Unfiled"], ...folderOptions.map((f) => [String(f.id), f.label])] },
    ]}><label className="field full">File<input className="input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></label></ActionForm></div>
    <h2>Files ({total})</h2>
    <MediaFileTable key={`${folderId}-${q}-${sort}-${currentPage}`} media={media} folders={folderOptions} cms={cms} />
    {total > pageSize && <nav className="btn-row" aria-label="Media file pages" style={{ marginTop: 18 }}>{currentPage > 1 && <Link className="btn btn-ghost btn-sm" href={pageUrl(currentPage - 1)}>Previous</Link>}<span>Page {currentPage} of {Math.ceil(total / pageSize)}</span>{currentPage * pageSize < total && <Link className="btn btn-ghost btn-sm" href={pageUrl(currentPage + 1)}>Next</Link>}</nav>}
  </>;
}
