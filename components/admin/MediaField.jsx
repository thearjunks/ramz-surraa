"use client";
import Link from "next/link";

export default function MediaField({ label, value, onChange, media = [], cms = false }) {
  return <div className="field cms-media-field">
    <label>{label}<input className="input" value={value || ""} placeholder="/media/image.jpg" onChange={(e) => onChange(e.target.value)} /></label>
    <div className="cms-media-tools">
      <select className="input" aria-label={`Choose ${label.toLowerCase()} from media library`} value={media.some((m) => m.url === value) ? value : ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose an uploaded image…</option>
        {media.map((m) => <option key={m.url} value={m.url}>{m.alt_text || m.url}</option>)}
      </select>
      <Link className="btn btn-ghost btn-sm" href={cms ? "/cms/media/" : "/admin/content/media/"} target="_blank">Upload new ↗</Link>
    </div>
    {value && <img className="cms-media-preview" src={value} alt="Selected image preview" />}
  </div>;
}
