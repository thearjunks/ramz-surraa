"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { src } from "@/lib/site";

export function Lightbox({ items, index, onClose, onMove }) {
  const close = useRef(null);
  useEffect(() => {
    if (index === null) return;
    close.current?.focus();
    document.body.style.overflow = "hidden";
    const key = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") onMove(-1); if (e.key === "ArrowRight") onMove(1); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [index, onClose, onMove]);
  const it = index === null ? null : items[index];
  return (
    <div className={"lightbox" + (it ? " open" : "")} role="dialog" aria-modal="true" aria-label="Image viewer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {it && <>
        <img src={src(it.src)} alt={it.alt} />
        <div className="cap">{it.alt}  ·  {index + 1} / {items.length}</div>
        <button ref={close} className="lb-btn lb-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        <button className="lb-btn lb-prev" aria-label="Previous" onClick={() => onMove(-1)}><Icon name="left" /></button>
        <button className="lb-btn lb-next" aria-label="Next" onClick={() => onMove(1)}><Icon name="right" /></button>
      </>}
    </div>
  );
}

// Masonry grid that opens images in the lightbox. tabs=true adds category filters.
export default function Gallery({ items, tabs = false, limit = 999 }) {
  const cats = ["All", ...new Set(items.map((i) => i.cat).filter(Boolean))];
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState(null);
  const from = useRef(null);
  const current = items.filter((i) => cat === "All" || i.cat === cat).slice(0, limit);
  const onClose = () => { setOpen(null); from.current?.focus(); };
  const onMove = (d) => setOpen((i) => (i + d + current.length) % current.length);
  return (
    <>
      {tabs && (
        <div className="tabs" role="toolbar" aria-label="Filter gallery">
          {cats.map((c) => <button key={c} className="tab" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      <div className="masonry">
        {current.map((g, n) => (
          <button key={g.src + n} aria-label={"Open image: " + g.alt} onClick={(e) => { from.current = e.currentTarget; setOpen(n); }}>
            <img src={src(g.src)} alt={g.alt} loading="lazy" />
          </button>
        ))}
      </div>
      <Lightbox items={current} index={open} onClose={onClose} onMove={onMove} />
    </>
  );
}
