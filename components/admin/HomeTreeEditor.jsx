"use client";
import { useState } from "react";
import MediaField from "./MediaField";
import { saveHomeDraft, publishHome, publishHomeSection } from "@/lib/home-actions";

const HOME_LABELS = { hero: "Banner / Hero Carousel", attend: "How to Attend", sundown: "SUNDOWN", membership: "Free Member Account", artists: "Our Artists" };

const field = (label, value, onChange, multiline = false) => <label className="field full">{label}{multiline
  ? <textarea className="input" rows="3" value={value || ""} onChange={(e) => onChange(e.target.value)} />
  : <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />}</label>;

function ChildList({ title, items, onChange, blank, media = [], kind }) {
  const [drag, setDrag] = useState(null);
  const update = (index, key, value) => onChange(items.map((item, n) => n === index ? { ...item, [key]: value } : item));
  const move = (from, to) => { if (from === to || from == null) return; const next = [...items]; next.splice(to, 0, next.splice(from, 1)[0]); onChange(next); };
  return <div className="home-children"><h3>{title}</h3>
    {items.map((item, index) => <details className="home-child" key={index}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); move(drag, index); setDrag(null); }}>
      <summary draggable onDragStart={(e) => { e.stopPropagation(); setDrag(index); e.dataTransfer.setData("text/plain", String(index)); }}>
        <span className="home-grip" aria-hidden="true">⋮⋮</span>{item.heading || item.name || item.caption || `${title} ${index + 1}`}
      </summary>
      <div className="home-child-body">
        {kind === "slides" ? <><MediaField label="Banner image" value={item.src} onChange={(v) => update(index, "src", v)} media={media} cms />
          {field("Caption", item.caption, (v) => update(index, "caption", v))}{field("Image position", item.pos, (v) => update(index, "pos", v))}</>
          : kind === "people" ? <>{field("Artist name", item.name, (v) => update(index, "name", v))}
            {field("Role", item.role, (v) => update(index, "role", v))}<MediaField label="Artist photo" value={item.photo} onChange={(v) => update(index, "photo", v)} media={media} cms /></>
            : <>{field("Heading", item.heading, (v) => update(index, "heading", v))}{field("Description", item.body, (v) => update(index, "body", v), true)}
              {kind === "perks" && field("Icon name", item.icon, (v) => update(index, "icon", v))}</>}
        <div className="btn-row"><button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>↓</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(items.filter((_, n) => n !== index))}>Remove</button></div>
      </div>
    </details>)}
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, { ...blank }])}>+ Add {title.toLowerCase()}</button>
  </div>;
}

export default function HomeTreeEditor({ initial, published, media = [], hasDraft }) {
  const [sections, setSections] = useState(initial);
  const [drag, setDrag] = useState(null);
  const update = (id, key, value) => setSections((old) => old.map((s) => s.id === id ? { ...s, [key]: value } : s));
  const move = (from, to) => { if (from === to || from == null) return; setSections((old) => { const next = [...old]; next.splice(to, 0, next.splice(from, 1)[0]); return next; }); };
  return <form action={saveHomeDraft} className="home-tree-form">
    <input type="hidden" name="content" value={JSON.stringify(sections)} />
    <p className="muted">Drag a section or child by its handle. The arrow buttons provide the same ordering control.</p>
    <div className="home-tree" role="tree" aria-label="Homepage sections">
      {sections.map((s, index) => <details key={s.id} className="home-node" open={index === 0}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); move(drag, index); setDrag(null); }}>
        <summary draggable onDragStart={(e) => { setDrag(index); e.dataTransfer.setData("text/plain", String(index)); }}>
          <span className="home-grip" aria-hidden="true">⋮⋮</span><b>{index + 1}. {HOME_LABELS[s.id]}</b>
          <span className="pill">{JSON.stringify(s) === JSON.stringify(published.find((item) => item.id === s.id)) ? "Published" : "Draft changes"}</span>
        </summary>
        <div className="home-node-body">
          <div className="btn-row"><label><input type="checkbox" checked={s.visible} onChange={(e) => update(s.id, "visible", e.target.checked)} /> Show on homepage</label>
            <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => move(index, index - 1)}>↑ Move up</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={index === sections.length - 1} onClick={() => move(index, index + 1)}>↓ Move down</button></div>
          {field("Eyebrow label", s.kicker, (v) => update(s.id, "kicker", v))}
          {field("Heading", s.heading, (v) => update(s.id, "heading", v))}
          {field("Description", s.description, (v) => update(s.id, "description", v), true)}
          {s.id === "hero" && <><ChildList title="Banner slides" kind="slides" items={s.slides || []} onChange={(v) => update(s.id, "slides", v)} blank={{ src: "", pos: "center", caption: "" }} media={media} />
            {field("Secondary button", s.secondaryLabel, (v) => update(s.id, "secondaryLabel", v))}{field("Secondary link", s.secondaryHref, (v) => update(s.id, "secondaryHref", v))}</>}
          {s.id === "attend" && <><ChildList title="Steps" kind="steps" items={s.steps || []} onChange={(v) => update(s.id, "steps", v)} blank={{ heading: "", body: "" }} />
            {field("Tracking button", s.trackLabel, (v) => update(s.id, "trackLabel", v))}{field("Tracking link", s.trackHref, (v) => update(s.id, "trackHref", v))}</>}
          {s.id === "sundown" && <><MediaField label="Event poster override" value={s.poster || ""} onChange={(v) => update(s.id, "poster", v)} media={media} cms />
            <p className="muted">Leave heading, description, or poster empty to use the current event details.</p>{field("Event details button", s.buttonLabel, (v) => update(s.id, "buttonLabel", v))}</>}
          {s.id === "membership" && <><ChildList title="Benefits" kind="perks" items={s.perks || []} onChange={(v) => update(s.id, "perks", v)} blank={{ heading: "", body: "", icon: "star" }} />
            {field("Primary button", s.primaryLabel, (v) => update(s.id, "primaryLabel", v))}{field("Primary link", s.primaryHref, (v) => update(s.id, "primaryHref", v))}
            {field("Secondary button", s.secondaryLabel, (v) => update(s.id, "secondaryLabel", v))}{field("Secondary link", s.secondaryHref, (v) => update(s.id, "secondaryHref", v))}</>}
          {s.id === "artists" && <><ChildList title="Artists" kind="people" items={s.people || []} onChange={(v) => update(s.id, "people", v)} blank={{ slug: "", name: "", photo: "", role: "", group: "" }} media={media} />
            {field("All artists button", s.buttonLabel, (v) => update(s.id, "buttonLabel", v))}{field("All artists link", s.buttonHref, (v) => update(s.id, "buttonHref", v))}</>}
          <button className="btn btn-ghost btn-sm" type="submit" name="section_id" value={s.id} formAction={publishHomeSection}>Publish this section</button>
        </div>
      </details>)}
    </div>
    <div className="btn-row" style={{ marginTop: 20 }}><button className="btn btn-ghost" type="submit">Save draft</button>
      <button className="btn btn-primary" type="submit" formAction={publishHome}>Publish changes</button></div>
    {hasDraft && <p className="muted">The saved draft differs from the live homepage. Publishing will make these changes visible.</p>}
  </form>;
}
