"use client";
// Small interactive bits for the admin: saved filter presets, select-all, Civil ID reveal, confirm-before-submit.
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { revealCivil } from "@/lib/admin-actions";

export function Presets() {
  const [list, setList] = useState([]);
  const KEY = "sca-admin-presets";
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {} }, []);
  const save = (l) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  const add = () => {
    const name = prompt("Name this filter preset:");
    if (name) save([...list.filter((p) => p.name !== name), { name, q: location.search }]);
  };
  return (
    <div className="presets">
      <span className="muted">Presets:</span>
      {list.map((p) => <span key={p.name} className="chip-x"><a href={"/admin/bookings/" + p.q}>{p.name}</a><button type="button" aria-label={"Delete " + p.name} onClick={() => save(list.filter((x) => x !== p))}>×</button></span>)}
      <button type="button" className="linkish" onClick={add}>+ Save current filters</button>
    </div>
  );
}

export function SelectAll() {
  return <input type="checkbox" aria-label="Select all on this page" onChange={(e) => document.querySelectorAll('input[name="ids"]').forEach((c) => (c.checked = e.target.checked))} />;
}

export function CivilReveal({ id, masked, allowed }) {
  const [v, setV] = useState("");
  if (!allowed) return <span>{masked}</span>;
  return v ? <span className="mono">{v}</span> : <span>{masked} <button type="button" className="linkish" onClick={async () => setV(await revealCivil(id))}>Reveal (logged)</button></span>;
}

export function ConfirmButton({ children, message, className = "btn btn-ghost", ...props }) {
  return <button className={className} {...props} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}

export function BulkDeleteButton({ action }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(document.querySelectorAll('input[name="ids"]:checked').length);
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  if (!count) return null;
  return <ConfirmButton className="btn btn-ghost btn-sm" formAction={action} message={`Permanently delete ${count} selected booking${count === 1 ? "" : "s"} and all related records? This cannot be undone.`}>Delete selected ({count})</ConfirmButton>;
}

export function EmailSendButton() {
  const { pending } = useFormStatus();
  return <button className="btn btn-ghost btn-sm" disabled={pending}>{pending ? "Sending email…" : "Resend status email"}</button>;
}
