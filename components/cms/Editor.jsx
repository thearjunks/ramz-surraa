"use client";
// Schema-driven content editor: text fields, repeatable lists (reorder / add / remove),
// image picker with the media library + upload, and a sticky save bar.
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { section as getSection } from "@/lib/content-schema";
import { saveContent } from "@/lib/cms-actions";

export const imgSrc = (p) => (!p ? "" : /^https?:/.test(p) ? p : "/" + String(p).replace(/^\//, ""));
let uid = 0;
const withIds = (arr) => (arr || []).map((x) => ({ ...x, _id: ++uid }));
const strip = (v, fields) => Object.fromEntries(fields.filter((f) => f.name).map((f) => [f.name, f.type === "list" ? (v[f.name] || []).map(({ _id, ...r }) => r) : v[f.name]]));

export async function uploadFiles(files) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append("file", f));
  const r = await fetch("/cms/upload/", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({ error: "Upload failed." }));
  if (!r.ok) throw new Error(j.error || "Upload failed.");
  return j.paths;
}

// ---------- media library picker ----------
function Picker({ library, setLibrary, onPick, onClose, multi }) {
  const [q, setQ] = useState("");
  const [added, setAdded] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const shown = library.filter((m) => !q || m.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  async function up(files) {
    if (!files.length) return;
    setBusy(true); setErr("");
    try { const p = await uploadFiles(files); setLibrary((l) => [...p, ...l]); if (multi) { p.forEach(onPick); setAdded((n) => n + p.length); } else onPick(p[0]); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-label="Choose an image" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ed-modal-box">
        <div className="ed-modal-h">
          <h2>{multi ? "Add images" : "Choose an image"}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="ed-modal-tools">
          <label className="btn btn-primary"><Icon name="upload" />{busy ? "Uploading…" : "Upload from computer"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden disabled={busy} onChange={(e) => up(e.target.files)} />
          </label>
          <input type="search" placeholder="Search images…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search images" />
          {multi && <button type="button" className="btn btn-dark" onClick={onClose}><Icon name="check" />Done{added ? ` (${added} added)` : ""}</button>}
        </div>
        {multi && <p className="muted small" style={{ margin: "0 18px 10px" }}>Click photos to add them. Click Done when you're finished.</p>}
        {err && <div className="notice err" style={{ margin: "0 18px 10px" }}>{err}</div>}
        <div className="ed-lib">
          {shown.map((m) => (
            <button type="button" key={m} onClick={() => { onPick(m); if (multi) setAdded((n) => n + 1); }} title={m}>
              <img src={imgSrc(m)} alt="" loading="lazy" /><span>{m.split("/").pop()}</span>
            </button>
          ))}
          {!shown.length && <p className="muted" style={{ padding: 20 }}>No images found.</p>}
        </div>
      </div>
    </div>
  );
}

function ImageField({ value, onChange, lib, small }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function up(files) {
    if (!files.length) return;
    setBusy(true); setErr("");
    try { const p = await uploadFiles(files); lib.setLibrary((l) => [...p, ...l]); onChange(p[0]); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className={"ed-img" + (small ? " sm" : "")}>
      <button type="button" className="ed-thumb" onClick={() => setOpen(true)} aria-label={value ? "Change image" : "Choose image"}>
        {value ? <img src={imgSrc(value)} alt="" /> : <span><Icon name="image" />No image</span>}
      </button>
      <div className="ed-img-act">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}><Icon name="image" />{value ? "Change" : "Choose"}</button>
        <label className="btn btn-sm"><Icon name="upload" />{busy ? "Uploading…" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden disabled={busy} onChange={(e) => up(e.target.files)} />
        </label>
        {value && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange("")}>Remove</button>}
        {err && <small className="err-text">{err}</small>}
        {value && !small && <small className="muted mono" style={{ wordBreak: "break-all" }}>{value}</small>}
      </div>
      {open && <Picker library={lib.library} setLibrary={lib.setLibrary} onClose={() => setOpen(false)} onPick={(p) => { onChange(p); setOpen(false); }} />}
    </div>
  );
}

// several images (e.g. event photos): thumbnails you can reorder or remove, plus "Add images"
function ImagesField({ value, onChange, lib }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(value) ? value : [];
  const move = (i, d) => { const a = [...list]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="ed-imgs">
      {list.map((p, i) => (
        <figure key={p + i}>
          <img src={imgSrc(p)} alt="" />
          <div>
            <button type="button" className="icon-btn" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="left" /></button>
            <button type="button" className="icon-btn danger" aria-label="Remove photo" onClick={() => onChange(list.filter((_, n) => n !== i))}><Icon name="trash" /></button>
            <button type="button" className="icon-btn" aria-label="Move right" disabled={i === list.length - 1} onClick={() => move(i, 1)}><Icon name="right" /></button>
          </div>
        </figure>
      ))}
      <button type="button" className="ed-imgs-add" onClick={() => setOpen(true)}><Icon name="plus" />Add images</button>
      {open && <Picker multi library={lib.library} setLibrary={lib.setLibrary} onClose={() => setOpen(false)} onPick={(p) => onChange((cur) => [...(Array.isArray(cur) ? cur : []), p])} />}
    </div>
  );
}

// ---------- one field ----------
function Field({ f, value, onChange, lib, compact }) {
  const id = useMemo(() => "ed-" + ++uid, []);
  const t = f.type || "text";
  if (t === "hidden") return null;
  let input;
  if (t === "images") input = <ImagesField value={value} onChange={onChange} lib={lib} />;
  else if (t === "image") input = <ImageField value={value || ""} onChange={onChange} lib={lib} small={compact} />;
  else if (t === "textarea") input = <textarea id={id} rows={f.rows || 3} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
  else if (t === "lines") input = <textarea id={id} rows={6} value={Array.isArray(value) ? value.join("\n") : value || ""} onChange={(e) => onChange(e.target.value.split("\n"))} />;
  else if (t === "select") input = <select id={id} value={value || f.options[0][0]} onChange={(e) => onChange(e.target.value)}>{f.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  else input = <input id={id} type={t === "url" ? "url" : t === "email" ? "email" : t === "tel" ? "tel" : "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
  return (
    <div className={"ed-field" + (t === "textarea" || t === "lines" || t === "image" || t === "images" ? " wide" : "")}>
      {t === "image" || t === "images" ? <span className="ed-label">{f.label}</span> : <label className="ed-label" htmlFor={id}>{f.label}</label>}
      {input}
      {f.hint && <small className="ed-hint">{f.hint}</small>}
    </div>
  );
}

// ---------- repeatable list ----------
function List({ f, items, onChange, lib }) {
  const [open, setOpen] = useState(() => new Set(f.fixed ? items.slice(0, 1).map((x) => x._id) : []));
  const set = (i, k, v) => onChange((cur) => cur.map((it, n) => (n === i ? { ...it, [k]: typeof v === "function" ? v(it[k]) : v } : it)));
  const move = (i, d) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const remove = (i) => { if (confirm("Remove this item?")) onChange(items.filter((_, n) => n !== i)); };
  const add = () => { const it = { _id: ++uid }; f.item.forEach((x) => { if (x.type === "select") it[x.name] = x.options[0][0]; }); onChange([...items, it]); setOpen((s) => new Set(s).add(it._id)); };
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const img = f.item.find((x) => x.type === "image");
  const titleKey = f.title || f.item.find((x) => !x.type || x.type === "text")?.name;
  return (
    <div className="ed-list-wrap wide">
      <div className="ed-list-h"><span className="ed-label">{f.label} <em>{items.length}</em></span></div>
      <div className={"ed-list" + (f.grid ? " tiles" : "")}>
        {items.map((it, i) => {
          const isOpen = f.grid || open.has(it._id);
          return (
            <div key={it._id} className={"ed-item" + (isOpen ? " open" : "")}>
              <div className="ed-item-h">
                <span className="ed-num">{i + 1}</span>
                {img && !f.grid && (it[img.name] ? <img className="ed-mini" src={imgSrc(it[img.name])} alt="" /> : <span className="ed-mini ed-noimg"><Icon name="image" /></span>)}
                {!f.grid && <button type="button" className="ed-item-t" onClick={() => toggle(it._id)} aria-expanded={isOpen}>
                  <b>{it[titleKey] || <span className="muted">New item</span>}</b>
                  {f.item.filter((x) => x.type === "images").map((x) => <small key={x.name}>{(it[x.name] || []).length} photos</small>)}
                  {f.item.filter((x) => x.type === "select").map((x) => <small key={x.name}>{(x.options.find(([k]) => k === it[x.name]) || [])[1]}</small>)}
                </button>}
                <span className="ed-item-act">
                  {!f.fixed && <>
                  <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up2" /></button>
                  <button type="button" className="icon-btn" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><Icon name="down2" /></button>
                  <button type="button" className="icon-btn danger" aria-label="Remove" onClick={() => remove(i)}><Icon name="trash" /></button></>}
                  {!f.grid && <button type="button" className="icon-btn" aria-label={isOpen ? "Close" : "Edit"} onClick={() => toggle(it._id)}><Icon name={isOpen ? "up2" : "edit"} /></button>}
                </span>
              </div>
              {isOpen && <div className="ed-item-b">{f.item.map((x) => <Field key={x.name} f={x} value={it[x.name]} onChange={(v) => set(i, x.name, v)} lib={lib} compact={f.grid} />)}</div>}
            </div>
          );
        })}
      </div>
      {!f.fixed && <button type="button" className="btn ed-add" onClick={add}><Icon name="plus" />{f.add || "Add"}</button>}
    </div>
  );
}

// ---------- the editor ----------
export default function Editor({ sectionKey, initial, library: lib0, viewUrl }) {
  const s = getSection(sectionKey);
  const start = useMemo(() => Object.fromEntries(s.fields.filter((f) => f.name).map((f) => [f.name, f.type === "list" ? withIds(initial[f.name]) : initial[f.name]])), [initial, s]);
  const [data, setData] = useState(start);
  const [library, setLibrary] = useState(lib0);
  const [state, act, pending] = useActionState(saveContent, null);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(strip(start, s.fields)));
  const sent = useRef(null);
  const json = JSON.stringify(strip(data, s.fields));
  useEffect(() => { if (state?.ok && sent.current) setSavedJson(sent.current); }, [state]);
  const dirty = json !== savedJson;
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    addEventListener("beforeunload", h); return () => removeEventListener("beforeunload", h);
  }, [dirty]);
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: typeof v === "function" ? v(d[k] || []) : v }));
  const libApi = { library, setLibrary };

  // group fields into cards by "section" markers
  const cards = [];
  s.fields.forEach((f) => { if (f.type === "section" || !cards.length) cards.push({ head: f.type === "section" ? f : null, fields: [] }); if (f.type !== "section") cards[cards.length - 1].fields.push(f); });

  return (
    <form action={act} className="ed" onSubmit={() => { sent.current = json; }}>
      <input type="hidden" name="section" value={sectionKey} />
      <input type="hidden" name="data" value={json} />
      {s.fields.some((f) => /title|heading/i.test(f.name || "")) && <p className="ed-tip"><Icon name="star" />Tip: put <b>*stars*</b> around words in a title to show them in the SURRAA colour gradient — e.g. <code>How to *attend*</code>.</p>}
      {cards.map((c, n) => (
        <section className="k-card ed-card" key={n}>
          {c.head && <div className="ed-card-h"><h2><i>{n + 1}</i>{c.head.label}</h2>{c.head.hint && <p>{c.head.hint}</p>}</div>}
          <div className="ed-grid">
            {c.fields.map((f) => f.type === "list"
              ? <List key={f.name} f={f} items={data[f.name] || []} onChange={set(f.name)} lib={libApi} />
              : <Field key={f.name} f={f} value={data[f.name]} onChange={set(f.name)} lib={libApi} />)}
          </div>
        </section>
      ))}
      <div className={"ed-bar" + (dirty ? " dirty" : "")} role="region" aria-label="Save changes">
        <span className="ed-state" aria-live="polite">
          {pending ? "Saving…" : state?.error ? <span className="err-text">{state.error}</span> : dirty ? <><i className="dot" />Unsaved changes</> : state?.ok ? <><Icon name="check" />{state.ok}</> : "All changes saved"}
        </span>
        <span className="row">
          {viewUrl && <a className="btn btn-ghost" href={viewUrl} target="_blank" rel="noopener"><Icon name="eye" />View on website</a>}
          {dirty && <button type="button" className="btn" onClick={() => { if (confirm("Discard your unsaved changes?")) setData(Object.fromEntries(Object.entries(JSON.parse(savedJson)).map(([k, v]) => [k, Array.isArray(v) && s.fields.find((f) => f.name === k)?.type === "list" ? withIds(v) : v]))); }}><Icon name="undo" />Discard</button>}
          <button className="btn btn-primary" disabled={pending || !dirty}><Icon name="check" />{pending ? "Saving…" : "Save changes"}</button>
        </span>
      </div>
    </form>
  );
}
