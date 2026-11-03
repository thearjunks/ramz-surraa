"use client";
import { useState } from "react";

export default function CmsNavigation({ initial }) {
  const [items, setItems] = useState(initial);
  const change = (i, key, value) => setItems((list) => list.map((item, n) => n === i ? { ...item, [key]: value } : item));
  const move = (i, by) => setItems((list) => {
    const to = i + by;
    if (to < 0 || to >= list.length) return list;
    const next = [...list]; [next[i], next[to]] = [next[to], next[i]]; return next;
  });
  return <div className="full">
    <input type="hidden" name="items" value={JSON.stringify(items)} />
    {items.map((item, i) => <div className="a-card" key={i} style={{ marginBottom: 12 }}>
      <div className="btn-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((list) => list.filter((_, n) => n !== i))}>Remove</button></div>
      <label className="field">Label<input className="input" value={item.label} onChange={(e) => change(i, "label", e.target.value)} /></label>
      <label className="field">Link<input className="input" value={item.href} onChange={(e) => change(i, "href", e.target.value)} /></label>
      <label className="field">Location<select className="input" value={item.location} onChange={(e) => change(i, "location", e.target.value)}><option value="header">Header</option><option value="footer">Footer</option></select></label>
      <label className="field"><input type="checkbox" checked={item.visible} onChange={(e) => change(i, "visible", e.target.checked)} /> Visible</label>
    </div>)}
    <button className="btn btn-ghost" type="button" onClick={() => setItems((list) => [...list, { label: "", href: "/", location: "header", visible: true }])}>+ Add link</button>
  </div>;
}
