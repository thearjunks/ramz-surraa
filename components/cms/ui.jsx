// CMS building blocks (server components)
import Link from "next/link";
import Icon from "../Icon";
import { STATUS } from "@/lib/bookings";
import { PAYMENT_STATUS } from "@/lib/admin-query";

export function Head({ title, sub, back, children }) {
  return (
    <div className="cms-head">
      <div>
        {back && <Link className="crumb" href={back[0]}><Icon name="left" />{back[1]}</Link>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, href }) {
  const inner = <><small>{label}</small><b>{value}</b>{hint && <span>{hint}</span>}</>;
  return href ? <Link className="kpi" href={href}>{inner}</Link> : <div className="kpi">{inner}</div>;
}

export function Todo({ n, label, href, icon, tone = "warn" }) {
  return (
    <Link className={"todo tone-" + tone} href={href}>
      <span className="ic"><Icon name={icon} /></span>
      <div><b>{n}</b><span>{label}</span></div>
      <span className="go"><Icon name="right" /></span>
    </Link>
  );
}

export function Tabs({ items }) {
  return (
    <nav className="k-tabs" aria-label="Sections">
      {items.map((t) => <Link key={t.h} href={t.h} aria-current={t.on ? "page" : undefined}>{t.t}{t.n !== undefined && <em>{t.n}</em>}</Link>)}
    </nav>
  );
}

export function Empty({ title, children }) {
  return <div className="k-empty"><b>{title}</b>{children}</div>;
}

// capacity meter: confirmed (green) + pending (volt) + reserved (grey) out of capacity
export function Meter({ capacity, confirmed, pending, reserved = 0, available, checkedIn }) {
  const cap = Math.max(1, capacity);
  const w = (v) => `${Math.min(100, (v / cap) * 100)}%`;
  return (
    <div className="k-meter">
      <div className="k-meter-bar" role="img" aria-label={`${confirmed} confirmed, ${pending} pending, ${available} available of ${capacity}`}>
        <i className="c" style={{ width: w(confirmed) }} /><i className="p" style={{ width: w(pending) }} />{reserved > 0 && <i className="x" style={{ width: w(reserved) }} />}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--brand)" }} />Confirmed <b>{confirmed}</b></span>
        <span><i style={{ background: "var(--volt)" }} />Pending <b>{pending}</b></span>
        {reserved > 0 && <span><i style={{ background: "#9AA79A" }} />Held back <b>{reserved}</b></span>}
        <span>Available <b>{available}</b> of {capacity}</span>
        {checkedIn !== undefined && <span>Checked in <b>{checkedIn}</b></span>}
      </div>
    </div>
  );
}

export function Bars({ data, label }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="k-bars" role="img" aria-label={label + ": " + data.map((d) => `${d[0]} ${d[1]}`).join(", ")}>
      {data.map(([l, v], i) => <div key={l + i} className="k-bar" title={`${l}: ${v}`}><i style={{ height: `${(v / max) * 100}%` }}><em>{v}</em></i><span>{l}</span></div>)}
    </div>
  );
}

export function HBars({ rows }) {
  if (!rows.length) return <p className="muted small">No data yet.</p>;
  return rows.map(([l, v, m, extra]) => (
    <div className="hbar" key={l}>
      <div className="l"><span>{l}</span><b>{v}{m ? ` / ${m}` : ""}</b></div>
      <div className="t"><i style={{ width: `${m ? Math.min(100, (v / m) * 100) : 0}%` }} /></div>
      {extra && <small className="muted">{extra}</small>}
    </div>
  ));
}

// friendly booking status names for the CMS (same keys as lib/bookings STATUS)
export const S_LABEL = { ...STATUS, pending: "New request", awaiting: "Waiting for customer" };
const TONE = { pending: "warn", under_review: "info", contacted: "info", awaiting: "warn", confirmed: "up", checked_in: "done", rejected: "past", cancelled: "past", expired: "past" };
export const StatusTag = ({ s }) => <span className={"pill " + (TONE[s] || "")}>{S_LABEL[s] || s}</span>;
export const PayTag = ({ s }) => <span className={"pill " + (s === "paid" ? "up" : s === "partial" ? "warn" : s === "unpaid" ? "err" : "past")}>{PAYMENT_STATUS[s] || s}</span>;
export const kd = (n) => "KD " + Number(n || 0).toFixed(3);
export const initials = (name) => String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
