"use client";
import { useState } from "react";
import MediaField from "./MediaField";

export default function CmsEntryFields({ fields, initial, media, allowPdf = true }) {
  const [data, setData] = useState(initial);
  const update = (key, value) => setData((old) => ({ ...old, [key]: value }));
  return <div className="full form a-form3">{fields.map((field) => {
    const value = data[field.key] ?? "", name = `field_${field.key}`;
    if (field.type === "media") {
      return <MediaField key={field.key} label={field.label} name={name} value={value} required={field.required}
        media={media} allowPdf={allowPdf} onChange={(next) => update(field.key, next)} />;
    }
    if (field.type === "boolean") return <label className="field full" key={field.key}><span>{field.label}</span><input name={name} type="checkbox" checked={!!value} onChange={(e) => update(field.key, e.target.checked)} /></label>;
    return <label className={`field${field.type === "richtext" ? " full" : ""}`} key={field.key}>{field.label}{field.required && " *"}
      {field.type === "relation" ? <select className="input" name={name} value={value} required={field.required} onChange={(e) => update(field.key, e.target.value)}><option value="">Choose related entry</option>{field.options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        : field.type === "richtext" ? <textarea className="input" name={name} value={value} required={field.required} rows="5" onChange={(e) => update(field.key, e.target.value)} />
          : <input className="input" name={name} value={value} type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"} required={field.required} onChange={(e) => update(field.key, e.target.value)} />}
    </label>;
  })}</div>;
}
