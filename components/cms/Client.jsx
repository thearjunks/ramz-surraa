"use client";
// Interactive CMS pieces: select-all + bulk action bar, one-click status changes, Civil ID reveal, confirm buttons.
import { useActionState, useEffect, useState } from "react";
import Icon from "../Icon";
import { revealCivil, updateStatus } from "@/lib/admin-actions";

export function SelectAll() {
  return <input type="checkbox" aria-label="Select all on this page" onChange={(e) => {
    document.querySelectorAll('input[name="ids"]').forEach((c) => (c.checked = e.target.checked));
    document.dispatchEvent(new Event("cms-select"));
  }} />;
}

export function RowCheck({ id, label }) {
  return <input type="checkbox" name="ids" value={id} aria-label={label} onChange={() => document.dispatchEvent(new Event("cms-select"))} />;
}

const BULK = [["under_review", "Mark under review"], ["contacted", "Mark contacted"], ["awaiting", "Waiting for customer"], ["cancelled", "Cancel"]];

export function BulkBar() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const count = () => setN(document.querySelectorAll('input[name="ids"]:checked').length);
    document.addEventListener("cms-select", count); count();
    return () => document.removeEventListener("cms-select", count);
  }, []);
  if (!n) return <input type="hidden" name="confirm" value="yes" />;
  return (
    <div className="bulkbar" role="region" aria-label="Bulk actions">
      <input type="hidden" name="confirm" value="yes" />
      <b>{n} selected</b>
      {BULK.map(([s, l]) => (
        <button key={s} className={"btn btn-sm" + (s === "cancelled" ? " btn-danger" : "")} name="status" value={s}
          onClick={(e) => { if (!confirm(`${l} for ${n} booking${n > 1 ? "s" : ""}?${s === "cancelled" ? " Their passes will stop working." : ""}`)) e.preventDefault(); }}>{l}</button>
      ))}
      <span className="small" style={{ opacity: .7, width: "100%" }}>To confirm bookings and issue passes, open each booking — confirmations are done one at a time on purpose.</span>
    </div>
  );
}

export function CivilReveal({ id, masked, allowed }) {
  const [v, setV] = useState("");
  if (!allowed) return <span>{masked || "—"}</span>;
  return v ? <span className="mono">{v}</span> : <span>{masked} <button type="button" className="linkish" onClick={async () => setV(await revealCivil(id))}>Show (logged)</button></span>;
}

export function ConfirmButton({ children, message, className = "btn btn-sm" }) {
  return <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}

// One-click status change: pick an action → short explanation, optional note, email toggle → confirm.
const EXPLAIN = {
  confirmed: "Official entry passes with unique serial numbers and QR codes will be created now.",
  under_review: "Let the customer know you are looking at their request.",
  contacted: "Use after you have called or messaged the customer.",
  awaiting: "Use when you need something from the customer before you can confirm.",
  rejected: "The request is declined and its seats are released.",
  cancelled: "The booking is cancelled, its seats are released and any passes stop working.",
  expired: "Close a request that was never completed. Seats are released.",
};
export function QuickStatus({ id, actions }) {
  const [state, run, pending] = useActionState(updateStatus, null);
  const [pick, setPick] = useState(null);
  const a = actions.find((x) => x.s === pick);
  return (
    <div>
      <div className="acts">
        {actions.map((x) => (
          <button key={x.s} type="button" className={"btn " + (x.primary ? "btn-primary" : x.danger ? "btn-danger" : "") + (pick === x.s ? " sel" : "")} onClick={() => setPick(pick === x.s ? null : x.s)}>
            {x.primary && <Icon name="check" />}{x.l}
          </button>
        ))}
      </div>
      {a && (
        <form action={run} className="confirm-box">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={a.s} />
          <p style={{ fontWeight: 700 }}>{a.l}</p>
          <p className="muted small" style={{ margin: "2px 0 10px" }}>{EXPLAIN[a.s]}</p>
          <label className="small" htmlFor={"rm-" + id} style={{ fontWeight: 700 }}>Note (optional — saved in the history)</label>
          <textarea id={"rm-" + id} name="remarks" placeholder="e.g. Called customer, payment received in cash" style={{ minHeight: 70, marginTop: 6 }} />
          <label className="consent" style={{ margin: "10px 0 12px" }}><input type="checkbox" name="notify" defaultChecked={a.s !== "contacted" && a.s !== "expired"} /> Email the customer about this change</label>
          {state?.error && <div className="notice err" role="alert" style={{ marginBottom: 10 }}>{state.error}</div>}
          <div className="row">
            <button className={"btn " + (a.danger ? "btn-danger" : "btn-primary")} disabled={pending}>{pending ? "Saving…" : "Yes, " + a.l.toLowerCase()}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setPick(null)}>Back</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PrintButton() {
  return <button type="button" className="btn btn-sm" onClick={() => window.print()}><Icon name="download" />Print</button>;
}
