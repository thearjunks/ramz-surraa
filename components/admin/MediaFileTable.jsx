"use client";
import { useState } from "react";
import { moveCmsMediaBulk, deleteCmsMedia } from "@/lib/cms-actions";
import { updateMediaDetails } from "@/lib/media-folder-actions";
import { ConfirmButton } from "./Client";

export default function MediaFileTable({ media, folders, cms }) {
  const [selected, setSelected] = useState([]);
  const folderNames = Object.fromEntries(folders.map((f) => [f.id, f.label]));
  const all = !!media.length && selected.length === media.length;
  return <>
    <form id="bulk-media" action={moveCmsMediaBulk} className="a-inline" style={{ marginBottom: 14 }}>
      <input type="hidden" name="cms" value={cms ? "1" : "0"} />
      {selected.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
      <b>{selected.length} selected</b>
      <select className="input" name="folder_id" aria-label="Move selected files to folder"><option value="">Unfiled</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
      <button className="btn btn-ghost btn-sm" disabled={!selected.length}>Move selected files</button>
    </form>
    <div className="a-table-wrap"><table className="a-table"><thead><tr>
      <th><label><input type="checkbox" checked={all} disabled={!media.length} onChange={(e) => setSelected(e.target.checked ? media.map((m) => m.id) : [])} aria-label="Select all files on this page" /> All on page</label></th>
      <th>Preview</th><th>File details</th><th>Folder</th><th>Actions</th></tr></thead><tbody>
      {media.map((m) => <tr key={m.id}>
        <td><input type="checkbox" checked={selected.includes(m.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, m.id] : old.filter((id) => id !== m.id))} aria-label={`Select ${m.filename}`} /></td>
        <td>{m.mime.startsWith("image/") ? <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={m.alt_text} width="80" /></a> : <a href={m.url} target="_blank" rel="noreferrer">PDF ↗</a>}</td>
        <td><b>{m.filename}</b><br /><small>{m.mime} · {Math.ceil(m.size / 1024)} KB · {m.createdDate}</small><br /><code>{m.url}</code><br /><small>{m.alt_text}</small>
          <details style={{ marginTop: 8 }}><summary>Edit details</summary><form action={updateMediaDetails} className="stack" style={{ marginTop: 12 }}>
            <input type="hidden" name="cms" value={cms ? "1" : "0"} /><input type="hidden" name="id" value={m.id} />
            <label className="field">File name<input className="input" name="filename" defaultValue={m.filename} required maxLength="200" /></label>
            <label className="field">Image description<input className="input" name="alt_text" defaultValue={m.alt_text} maxLength="300" /></label>
            <small>Changing these details keeps the file URL unchanged. Page image descriptions are managed in their page editors.</small>
            <button className="btn btn-ghost btn-sm">Save details</button>
          </form></details>
        </td>
        <td>{folderNames[m.folder_id] || "Unfiled"}</td>
        <td><a href={m.url} target="_blank" rel="noreferrer">Preview ↗</a>
          {m.origin !== "built-in" && <form action={deleteCmsMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="cms" value={cms ? "1" : "0"} />
            <ConfirmButton className="btn btn-ghost btn-sm" message={`Permanently delete ${m.filename}?`}>Delete</ConfirmButton></form>}
        </td>
      </tr>)}
      {!media.length && <tr><td colSpan="5">No files in this folder.</td></tr>}
    </tbody></table></div>
  </>;
}
