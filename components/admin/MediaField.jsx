"use client";
import { useRef, useState } from "react";
import { src } from "@/lib/site";
import { uploadCmsMedia } from "@/lib/cms-actions";

const images = "image/jpeg,image/png,image/webp,image/gif";

export default function MediaField({ label, value, onChange, defaultValue = "", media = [], name, required = false, allowPdf = false }) {
  const input = useRef(null);
  const progress = useRef(null);
  const [localValue, setLocalValue] = useState(defaultValue);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const current = value ?? localValue;
  const change = onChange || setLocalValue;
  const options = [...uploads.filter((file) => !media.some((item) => item.url === file.url)), ...media];
  const selected = options.find((item) => item.url === src(current));

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!file.size || file.size > 10_000_000) {
      setError("Choose a non-empty file up to 10 MB.");
      return;
    }
    const data = new FormData();
    data.set("file", file);
    data.set("picker", allowPdf ? "media" : "image");
    // Keep the current field and unsaved edits in place until the selection is applied.
    progress.current.showModal();
    try {
      const result = await uploadCmsMedia(null, data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUploads((previous) => [result.media, ...previous]);
      change(result.media.url);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      progress.current?.close();
    }
  }

  return <div className={`field cms-media-field${name ? " full" : ""}`}>
    <label>{label}{required && " *"}<input className="input" name={name} required={required} value={current} placeholder="/media/image.jpg" onChange={(event) => change(event.target.value)} /></label>
    <div className="cms-media-tools">
      <select className="input" aria-label={`Choose ${label.toLowerCase()} from media library`} value={selected?.url || ""} onChange={(event) => change(event.target.value)}>
        <option value="">{allowPdf ? "Choose a media file…" : "Choose an uploaded image…"}</option>
        {options.map((item) => <option key={item.url} value={item.url}>{item.alt_text || item.filename || item.url}</option>)}
      </select>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current.click()}>Upload new</button>
      <input ref={input} type="file" hidden accept={allowPdf ? images + ",application/pdf" : images} aria-label={`Upload ${label.toLowerCase()}`} onChange={upload} />
    </div>
    <dialog className="cms-upload-progress" ref={progress} aria-label="Uploading file" onCancel={(event) => event.preventDefault()}><p role="status">Uploading your file…</p></dialog>
    {error && <p role="alert">{error}</p>}
    {current && (allowPdf && !selected?.mime?.startsWith("image/")
      ? <a href={src(current)} target="_blank" rel="noreferrer">Preview selected file ↗</a>
      : <img className="cms-media-preview" src={src(current)} alt={selected?.alt_text || "Selected image preview"} />)}
  </div>;
}
