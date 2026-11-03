"use client";
import { useState } from "react";

const OPTIONS = [["text", "Text"], ["richtext", "Rich text"], ["number", "Number"], ["boolean", "Yes / No"], ["date", "Date"], ["email", "Email"], ["media", "Media URL"]];

export default function CmsFieldsBuilder({ initial = [] }) {
  const [fields, setFields] = useState(initial);
  const update = (index, key, value) => setFields((old) => old.map((field, i) => i === index ? { ...field, [key]: value } : field));
  return <div className="full">
    <input type="hidden" name="fields" value={JSON.stringify(fields)} />
    <h2>Fields</h2><p className="muted">Define the fields editors will fill for every entry.</p>
    {fields.map((field, index) => <div className="a-card" key={index} style={{ marginBottom: 12 }}>
      <div className="a-form3">
        <label className="field">Field key<input className="input" value={field.key || ""} onChange={(e) => update(index, "key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="title" /></label>
        <label className="field">Label<input className="input" value={field.label || ""} onChange={(e) => update(index, "label", e.target.value)} placeholder="Title" /></label>
        <label className="field">Type<select className="input" value={field.type} onChange={(e) => update(index, "type", e.target.value)}>{OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><input type="checkbox" checked={!!field.required} onChange={(e) => update(index, "required", e.target.checked)} /> Required</label>
      </div>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setFields((old) => old.filter((_, i) => i !== index))}>Remove field</button>
    </div>)}
    <button className="btn btn-ghost" type="button" onClick={() => setFields((old) => [...old, { key: "", label: "", type: "text", required: false }])}>+ Add field</button>
  </div>;
}
