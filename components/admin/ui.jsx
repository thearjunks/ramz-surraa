// Admin building blocks (server components)
import Link from "next/link";
import { STATUS } from "@/lib/bookings";
import { PAYMENT_STATUS } from "@/lib/admin-query";

export function Head({ title, sub, children }) {
  return <div className="a-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>{children && <div className="btn-row">{children}</div>}</div>;
}

export function Stat({ label, value, hint, href, tone }) {
  const inner = <><small>{label}</small><b>{value}</b>{hint && <span>{hint}</span>}</>;
  return href ? <Link className={"a-stat " + (tone || "")} href={href}>{inner}</Link> : <div className={"a-stat " + (tone || "")}>{inner}</div>;
}

// Vertical bar chart with values on hover/aria — plain HTML/CSS, no chart library
export function Bars({ data, title, fmt = (v) => v, tone = "" }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <figure className="a-chart">
      <figcaption>{title}</figcaption>
      {data.length ? (
        <div className={"bars " + tone} role="img" aria-label={title + ": " + data.map((d) => `${d[0]} ${fmt(d[1])}`).join(", ")}>
          {data.map(([l, v], i) => <div key={l + i} className="bar" title={`${l}: ${fmt(v)}`}><i style={{ height: `${(v / max) * 100}%` }}><em>{fmt(v)}</em></i><span>{l}</span></div>)}
        </div>
      ) : <p className="muted">No data yet.</p>}
    </figure>
  );
}

// Horizontal stacked/meter rows: [label, value, max]
export function Meters({ rows, title }) {
  return (
    <figure className="a-chart">
      <figcaption>{title}</figcaption>
      {rows.length ? rows.map(([l, v, m, extra]) => (
        <div key={l} className="meter"><div className="meter-l"><span>{l}</span><b>{v}{m ? ` / ${m}` : ""}</b></div>
          <div className="meter-t"><i style={{ width: `${m ? Math.min(100, (v / m) * 100) : 0}%` }} /></div>{extra && <small className="muted">{extra}</small>}</div>
      )) : <p className="muted">No data yet.</p>}
    </figure>
  );
}

const TONE = { pending: "warn", under_review: "warn", contacted: "info", awaiting: "warn", confirmed: "up", checked_in: "up", rejected: "past", cancelled: "past", expired: "past" };
export const StatusTag = ({ s }) => <span className={"pill " + (TONE[s] || "")}>{STATUS[s] || s}</span>;
export const PayTag = ({ s }) => <span className={"pill " + (s === "paid" ? "up" : s === "partial" ? "warn" : s === "unpaid" ? "" : "past")}>{PAYMENT_STATUS[s] || s}</span>;
export const kd = (n) => "KD " + Number(n || 0).toFixed(3);
