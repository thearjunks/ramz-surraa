"use client";
import { useState } from "react";
import Link from "next/link";

export default function CmsEntryFields({ fields, initial, media }) {
  const [data, setData] = useState(initial);
  const update = (key, value) => setData((old) => ({ ...old, [key]: value }));
  return <div className="full form a-form3">{fields.map((field) => {
    const value = data[field.key] ?? "", name = `field_${field.key}`;
    if (field.type === "media") {
      const selected = media.find((m) => m.url === value);
      return <div className="field full" key={field.key}>
        <label>{field.label}{field.required && " *"}<input className="input" name={name} value={value} required={field.required} placeholder="/media/image.jpg" onChange={(e) => update(field.key, e.target.value)} /></label>
        <div className="cms-media-tools"><select className="input" aria-label={`Choose ${field.label} from media library`} value={selected ? value : ""} onChange={(e) => update(field.key, e.target.value)}><option value="">Choose a media file</option>{media.map((m) => <option key={m.url} value={m.url}>{m.filename}</option>)}</select><Link className="btn btn-ghost btn-sm" href="/cms/media/" target="_blank">Upload new ↗</Link></div>
        {value && (selected?.mime?.startsWith("image/") ? <img className="cms-media-preview" src={value} alt={selected.alt_text || "Selected media"} /> : <a href={value} target="_blank" rel="noreferrer">Preview selected file ↗</a>)}
      </div>;
    }
    if (field.type === "boolean") return <label className="field full" key={field.key}><span>{field.label}</span><input name={name} type="checkbox" checked={!!value} onChange={(e) => update(field.key, e.target.checked)} /></label>;
    return <label className={`field${field.type === "richtext" ? " full" : ""}`} key={field.key}>{field.label}{field.required && " *"}
      {field.type === "relation" ? <select className="input" name={name} value={value} required={field.required} onChange={(e) => update(field.key, e.target.value)}><option value="">Choose related entry</option>{field.options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        : field.type === "richtext" ? <textarea className="input" name={name} value={value} required={field.required} rows="5" onChange={(e) => update(field.key, e.target.value)} />
          : <input className="input" name={name} value={value} type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"} required={field.required} onChange={(e) => update(field.key, e.target.value)} />}
    </label>;
  })}</div>;
}
