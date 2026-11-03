"use client";
import { useState } from "react";
import MediaField from "./MediaField";
import { saveRouteDraft, publishRouteTree, publishRouteSection } from "@/lib/route-tree-actions";

const input = (label, value, onChange, multiline = false) => <label className="field full">{label}{multiline
  ? <textarea className="input" rows="3" value={value || ""} onChange={(e) => onChange(e.target.value)} />
  : <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />}</label>;

export default function RouteTreeEditor({ slug, initial, published, media }) {
  const [nodes, setNodes] = useState(initial), [drag, setDrag] = useState(null);
  const update = (id, key, value) => setNodes((old) => old.map((n) => n.id === id ? { ...n, [key]: value } : n));
  const childUpdate = (id, index, key, value) => setNodes((old) => old.map((n) => n.id === id
    ? { ...n, items: n.items.map((item, i) => i === index ? { ...item, [key]: value } : item) } : n));
  const move = (from, to) => { if (from == null || from === to) return; setNodes((old) => {
    const next = [...old]; next.splice(to, 0, next.splice(from, 1)[0]); return next;
  }); };
  const moveChild = (id, from, to) => setNodes((old) => old.map((n) => {
    if (n.id !== id || from === to || from < 0 || to < 0 || to >= n.items.length) return n;
    const next = [...n.items]; next.splice(to, 0, next.splice(from, 1)[0]); return { ...n, items: next };
  }));
  return <form action={saveRouteDraft} className="home-tree-form">
    <input type="hidden" name="slug" value={slug} /><input type="hidden" name="content" value={JSON.stringify(nodes)} />
    <p className="muted">Expand a section to edit it. Drag a section by its handle, or use the arrows. Save a draft before previewing.</p>
    <div className="home-tree" role="tree" aria-label="Page sections">
      {nodes.map((n, index) => <details className="home-node" key={n.id} open={index === 0}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); move(drag, index); setDrag(null); }}>
        <summary draggable onDragStart={(e) => { setDrag(index); e.dataTransfer.setData("text/plain", String(index)); }}>
          <span className="home-grip" aria-hidden="true">⋮⋮</span><b>{index + 1}. {n.label}</b>
          <span className="pill">{JSON.stringify(n) === JSON.stringify(published.find((p) => p.id === n.id)) ? "Published" : "Draft changes"}</span>
        </summary>
        <div className="home-node-body">
          <div className="btn-row"><label><input type="checkbox" checked={n.visible} onChange={(e) => update(n.id, "visible", e.target.checked)} /> Show on page</label>
            <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => move(index, index - 1)}>↑ Move up</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={index === nodes.length - 1} onClick={() => move(index, index + 1)}>↓ Move down</button></div>
          {n.kicker !== undefined && input("Eyebrow label", n.kicker, (v) => update(n.id, "kicker", v))}
          {n.heading !== undefined && input("Heading", n.heading, (v) => update(n.id, "heading", v))}
          {n.body !== undefined && input(n.type === "article" ? "Introduction" : "Description", n.body, (v) => update(n.id, "body", v), true)}
          {(n.images || []).map((image, i) => <MediaField key={i} label={`Image ${i + 1}`} value={image} media={media} cms onChange={(v) =>
            update(n.id, "images", n.images.map((old, j) => i === j ? v : old))} />)}
          {n.items && <div className="home-children"><h3>{n.type === "article" ? "Article sections" : n.type === "benefits" ? "Benefits" : n.type === "contact-details" ? "Contact fields" : "Items"}</h3>
            {n.items.map((item, i) => <details className="home-child" key={i}><summary><span className="home-grip" aria-hidden="true">⋮⋮</span>{item.heading || item.name || item.alt || `Item ${i + 1}`}</summary>
              <div className="home-child-body">{item.heading !== undefined && input("Heading", item.heading, (v) => childUpdate(n.id, i, "heading", v))}
                {item.name !== undefined && input("Artist name", item.name, (v) => childUpdate(n.id, i, "name", v))}
                {item.body !== undefined && input("Text", item.body, (v) => childUpdate(n.id, i, "body", v), true)}
                {item.icon !== undefined && input("Icon", item.icon, (v) => childUpdate(n.id, i, "icon", v))}
                {item.role !== undefined && input("Role", item.role, (v) => childUpdate(n.id, i, "role", v))}
                {item.src !== undefined && <MediaField label="Gallery image" value={item.src} media={media} cms onChange={(v) => childUpdate(n.id, i, "src", v)} />}
                {item.alt !== undefined && input("Image description", item.alt, (v) => childUpdate(n.id, i, "alt", v))}
                {item.photo !== undefined && <MediaField label="Artist photo" value={item.photo} media={media} cms onChange={(v) => childUpdate(n.id, i, "photo", v)} />}
                <div className="btn-row"><button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moveChild(n.id, i, i - 1)}>↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === n.items.length - 1} onClick={() => moveChild(n.id, i, i + 1)}>↓</button>
                  {!["contact-details"].includes(n.type) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(n.id, "items", n.items.filter((_, j) => i !== j))}>Remove</button>}</div>
              </div></details>)}
            {!["contact-details", "events", "past-events"].includes(n.type) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(n.id, "items", [...n.items,
              n.type === "gallery" ? { src: "", alt: "" } : n.type === "artist-group" ? { slug: "", name: "New artist", role: "", photo: "" } : { heading: "New item", body: "" }])}>+ Add item</button>}
          </div>}
          <button type="submit" className="btn btn-ghost btn-sm" formAction={publishRouteSection.bind(null, n.id)}>Publish this section</button>
        </div>
      </details>)}
    </div>
    <div className="btn-row" style={{ marginTop: 20 }}><button className="btn btn-ghost" type="submit">Save draft</button>
      <button className="btn btn-primary" type="submit" formAction={publishRouteTree}>Publish changes</button></div>
  </form>;
}
