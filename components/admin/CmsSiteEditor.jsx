"use client";
import { useState } from "react";

const GROUPS = [
  ["company", "Company & contact"], ["membership", "Membership"],
];
const LISTS = [
  ["hero", "slides", "Home banners", { src: "", pos: "center", caption: "" }],
  ["artists", null, "Artists", { slug: "", name: "", group: "team", role: "", photo: "" }],
  ["gallery", null, "Gallery", { src: "", alt: "" }],
];

export default function CmsSiteEditor({ initial }) {
  const [data, setData] = useState(initial);
  const setGroup = (group, key, value) => setData((d) => ({ ...d, [group]: { ...d[group], [key]: value } }));
  const updateList = (group, key, fn) => setData((d) => {
    const old = key ? d[group][key] : d[group];
    const updated = fn(old);
    return key ? { ...d, [group]: { ...d[group], [key]: updated } } : { ...d, [group]: updated };
  });
  return <div className="full">
    <input type="hidden" name="content" value={JSON.stringify(data)} />
    {GROUPS.map(([group, title]) => <details key={group} className="a-card" style={{ marginBottom: 14 }} open={group === "company"}><summary><h2 style={{ display: "inline" }}>{title}</h2></summary><div className="form a-form3" style={{ marginTop: 16 }}>
      {Object.entries(data[group] || {}).map(([key, value]) => Array.isArray(value)
        ? <label key={key} className="field full">{key}<textarea className="input" rows="3" value={value.join("\n")} onChange={(e) => setGroup(group, key, e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></label>
        : <label key={key} className="field">{key}<input className="input" value={String(value ?? "")} onChange={(e) => setGroup(group, key, e.target.value)} /></label>)}
    </div></details>)}
    {LISTS.map(([group, key, title, blank]) => {
      const list = key ? data[group]?.[key] || [] : data[group] || [];
      return <details key={group} className="a-card" style={{ marginBottom: 14 }}><summary><h2 style={{ display: "inline" }}>{title} ({list.length})</h2></summary>
        {list.map((item, i) => <div key={i} className="a-card" style={{ marginTop: 14 }}><div className="btn-row"><b>{title} {i + 1}</b>
          <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => updateList(group, key, (items) => { const x = [...items]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; return x; })}>↑</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={i === list.length - 1} onClick={() => updateList(group, key, (items) => { const x = [...items]; [x[i + 1], x[i]] = [x[i], x[i + 1]]; return x; })}>↓</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateList(group, key, (items) => items.filter((_, n) => n !== i))}>Remove</button></div>
          {Object.entries(item).map(([field, value]) => <label key={field} className="field">{field}<input className="input" value={String(value ?? "")} onChange={(e) => updateList(group, key, (items) => items.map((x, n) => n === i ? { ...x, [field]: e.target.value } : x))} /></label>)}
        </div>)}
        <button type="button" className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => updateList(group, key, (items) => [...items, { ...blank }])}>+ Add {title.toLowerCase()}</button>
      </details>;
    })}
  </div>;
}
