// Server-rendered building blocks for events and entry passes.
import Link from "next/link";
import Icon from "./Icon";
import { src } from "@/lib/site";
import { STATUS } from "@/lib/bookings";

export function EventCard({ e }) {
  const url = `/events/${e.slug}/`;
  return (
    <article className="card ev-card reveal">
      <Link className="ev-img" href={url} tabIndex={-1} aria-hidden="true"><img src={src(e.poster) || "/images/poster-en.jpg"} alt="" loading="lazy" /></Link>
      <div className="ev-body">
        <div className="pills"><span className={"pill " + (e.state.key === "open" ? "up" : e.state.key === "completed" ? "past" : "")}>{e.stateLabel}</span>{e.category && <span className="pill">{e.category}</span>}</div>
        <h2 style={{ fontSize: "clamp(30px,4vw,46px)" }}><Link href={url}>{e.title}</Link></h2>
        <ul className="meta-list" style={{ margin: 0 }}><li><Icon name="cal" />{e.dateLabel}</li><li><Icon name="pin" />{e.venue}{e.area ? ", " + e.area : ""}</li></ul>
        {e.description && <p className="muted">{e.description}</p>}
        <div className="btn-row">
          <Link className="btn btn-ghost" href={url}>Event details <Icon name="arrow" /></Link>
          {e.state.open && <Link className="btn btn-sun" href={url + "entry-pass/"}><Icon name="ticket" />Get entry pass</Link>}
        </div>
      </div>
    </article>
  );
}

export function PassButton({ e, cls = "btn-sun", label = "Get entry pass" }) {
  if (!e.state.open) return <span className="btn btn-ghost" aria-disabled="true" style={{ opacity: 0.7, cursor: "default" }}>{e.stateLabel}</span>;
  return <Link className={"btn " + cls} href={`/events/${e.slug}/entry-pass/`}><Icon name="ticket" />{label}</Link>;
}

const STEPS = [["pending", "Request submitted"], ["under_review", "Under review"], ["contacted", "Contacted"], ["confirmed", "Confirmed"], ["issued", "Entry pass issued"]];
const ORDER = { pending: 0, under_review: 1, contacted: 2, awaiting: 2, confirmed: 4, checked_in: 4 };
const ENDED = {
  rejected: "This request was not approved. Please contact us if you have questions.",
  cancelled: "This request has been cancelled. Any passes issued for it are no longer valid.",
  expired: "This request expired before it could be confirmed.",
};

export function Timeline({ status }) {
  if (ENDED[status]) return <div className="notice err" style={{ display: "block" }}><b>{STATUS[status]}.</b> {ENDED[status]}</div>;
  const at = ORDER[status] ?? 0;
  return (
    <ol className="timeline" aria-label="Request status">
      {STEPS.map(([k, t], i) => <li key={k} className={i < at ? "done" : i === at ? "now" : ""}><span />{t}{k === "contacted" && status === "awaiting" && <small>Awaiting completion</small>}</li>)}
    </ol>
  );
}

export const noindex = { robots: { index: false, follow: false } };
