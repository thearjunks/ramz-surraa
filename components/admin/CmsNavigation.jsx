"use client";
import { useState } from "react";

export default function CmsNavigation({ initial }) {
  const [items, setItems] = useState(initial);
  const [drag, setDrag] = useState(null);
  const change = (i, key, value) => setItems((list) => list.map((item, n) => n === i ? { ...item, [key]: value } : item));
  const move = (i, by) => setItems((list) => {
    const to = i + by;
    if (to < 0 || to >= list.length) return list;
    const next = [...list]; [next[i], next[to]] = [next[to], next[i]]; return next;
  });
  const drop = (from, to) => setItems((list) => { if (from == null || from === to) return list; const next = [...list]; next.splice(to, 0, next.splice(from, 1)[0]); return next; });
  return <div className="full">
    <input type="hidden" name="items" value={JSON.stringify(items)} />
    {items.map((item, i) => <div className="a-card" key={item.key} style={{ marginBottom: 12 }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); drop(drag, i); setDrag(null); }}>
      <div draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.setData("text/plain", String(i)); }} style={{ cursor: "grab", fontWeight: 700 }}>⋮⋮ {item.parentKey ? "↳ " : ""}{item.label || "New link"}</div>
      <div className="btn-row"><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((list) => list.filter((_, n) => n !== i).map((x) => x.parentKey === item.key ? { ...x, parentKey: "" } : x))}>Remove</button></div>
      <label className="field">Label<input className="input" value={item.label} onChange={(e) => change(i, "label", e.target.value)} /></label>
      <label className="field">Link<input className="input" value={item.href} onChange={(e) => change(i, "href", e.target.value)} /></label>
      <label className="field">Location<select className="input" value={item.location} onChange={(e) => setItems((list) => list.map((x, n) => n === i ? { ...x, location: e.target.value, parentKey: "" } : x.parentKey === item.key ? { ...x, parentKey: "" } : x))}><option value="header">Header</option><option value="footer">Footer</option></select></label>
      <label className="field">Parent menu<select className="input" value={item.parentKey || ""} onChange={(e) => change(i, "parentKey", e.target.value)}><option value="">Top level</option>
        {items.filter((other) => other.key !== item.key && other.location === item.location).map((other) => <option key={other.key} value={other.key}>{other.label}</option>)}</select></label>
      <label className="field"><input type="checkbox" checked={item.visible} onChange={(e) => change(i, "visible", e.target.checked)} /> Visible</label>
    </div>)}
    <button className="btn btn-ghost" type="button" onClick={() => setItems((list) => [...list, { key: crypto.randomUUID(), label: "", href: "/", location: "header", parentKey: "", visible: true }])}>+ Add link</button>
  </div>;
}
