"use client";
import { useState } from "react";
import MediaField from "./MediaField";

const EMPTY = { type: "text", heading: "", body: "", image: "", buttonLabel: "", buttonHref: "", visible: true };
const TYPES = [["hero", "Hero banner"], ["text", "Text"], ["image", "Image"], ["cta", "Call to action"], ["artists", "Artists"], ["gallery", "Gallery"], ["events", "Upcoming events"], ["component", "Reusable component"]];

export default function CmsSections({ initial = [], media = [], components = [], cms = false }) {
  const [sections, setSections] = useState(initial);
  const change = (i, key, value) => setSections((list) => list.map((s, n) => n === i ? { ...s, [key]: value } : s));
  const move = (i, by) => setSections((list) => {
    const next = [...list], to = i + by;
    if (to < 0 || to >= next.length) return list;
    [next[i], next[to]] = [next[to], next[i]];
    return next;
  });
  return <div className="full">
    <input type="hidden" name="sections" value={JSON.stringify(sections)} />
    <h2>Page sections</h2>
    <p className="muted">Add sections and arrange them in the order visitors should see them.</p>
    {sections.map((s, i) => <section className="a-card" key={i} style={{ marginBottom: 14 }}>
      <div className="btn-row" style={{ justifyContent: "space-between" }}><b>Section {i + 1}</b><div className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === sections.length - 1}>↓</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSections((list) => [...list.slice(0, i + 1), { ...s }, ...list.slice(i + 1)])}>Duplicate</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSections((list) => list.filter((_, n) => n !== i))}>Delete</button>
      </div></div>
      <label className="field">Type<select className="input" value={s.type} onChange={(e) => change(i, "type", e.target.value)}>{TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      {s.type === "component" && <label className="field">Reusable component<select className="input" value={s.componentId || ""} onChange={(e) => change(i, "componentId", Number(e.target.value))}><option value="">Select component…</option>{components.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label className="field"><input type="checkbox" checked={s.visible !== false} onChange={(e) => change(i, "visible", e.target.checked)} /> Show this section on the website</label>
      <label className="field">Heading<input className="input" value={s.heading || ""} onChange={(e) => change(i, "heading", e.target.value)} /></label>
      <label className="field">Text<textarea className="input" rows="4" value={s.body || ""} onChange={(e) => change(i, "body", e.target.value)} /></label>
      {(s.type === "hero" || s.type === "image") && <MediaField label="Image" value={s.image || ""} onChange={(value) => change(i, "image", value)} media={media} cms={cms} />}
      {(s.type === "hero" || s.type === "cta") && <><label className="field">Button label<input className="input" value={s.buttonLabel || ""} onChange={(e) => change(i, "buttonLabel", e.target.value)} /></label><label className="field">Button link<input className="input" value={s.buttonHref || ""} placeholder="/events/" onChange={(e) => change(i, "buttonHref", e.target.value)} /></label></>}
    </section>)}
    <button type="button" className="btn btn-ghost" onClick={() => setSections((list) => [...list, { ...EMPTY }])}>+ Add section</button>
    {components.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setSections((list) => [...list, { type: "component", componentId: components[0].id, visible: true }])}>+ Add reusable component</button>}
  </div>;
}
