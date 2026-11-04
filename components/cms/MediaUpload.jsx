"use client";
// Drag & drop / pick images → uploaded to the library, then the page refreshes.
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "../Icon";
import { uploadFiles } from "./Editor";

export default function MediaUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [over, setOver] = useState(false);
  async function go(files) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try { const p = await uploadFiles(files); setMsg({ ok: `${p.length} image${p.length > 1 ? "s" : ""} uploaded.` }); router.refresh(); }
    catch (e) { setMsg({ err: e.message }); }
    setBusy(false);
  }
  return (
    <div className={"drop" + (over ? " over" : "")} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); go(e.dataTransfer.files); }}>
      <Icon name="upload" />
      <b>{busy ? "Uploading…" : "Drag photos here"}</b>
      <span className="muted small">or</span>
      <label className="btn btn-primary">Choose from computer<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden disabled={busy} onChange={(e) => go(e.target.files)} /></label>
      <small className="muted">JPG, PNG, WebP or GIF · up to 8 MB each</small>
      {msg && <div className={"notice " + (msg.err ? "err" : "ok")}>{msg.err || msg.ok}</div>}
    </div>
  );
}
