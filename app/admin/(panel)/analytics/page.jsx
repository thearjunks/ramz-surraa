import Link from "next/link";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { Head, Stat, Bars, Meters } from "@/components/admin/ui";

const WINDOWS = new Set([7, 30, 90]);
export default async function Analytics({ searchParams }) {
  await requirePerm("analytics");
  const sp = await searchParams;
  const days = WINDOWS.has(Number(sp.days)) ? Number(sp.days) : 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const totals = db.prepare(`SELECT COUNT(CASE WHEN event_type='page_view' THEN 1 END) views,
    COUNT(CASE WHEN event_type='link_click' THEN 1 END) clicks, COUNT(DISTINCT visitor_id) visitors,
    COUNT(DISTINCT session_id) sessions, COALESCE(SUM(CASE WHEN event_type='engagement' THEN engagement_ms END),0) engagement
    FROM analytics_events WHERE at >= ?`).get(since);
  const pages = db.prepare(`SELECT path, COUNT(*) views, COUNT(DISTINCT visitor_id) visitors FROM analytics_events
    WHERE at >= ? AND event_type='page_view' GROUP BY path ORDER BY views DESC LIMIT 12`).all(since);
  const clicks = db.prepare(`SELECT label, target, COUNT(*) clicks, COUNT(DISTINCT visitor_id) visitors FROM analytics_events
    WHERE at >= ? AND event_type='link_click' GROUP BY label, target ORDER BY clicks DESC LIMIT 12`).all(since);
  const countries = db.prepare(`SELECT country, COUNT(DISTINCT visitor_id) visitors FROM analytics_events
    WHERE at >= ? AND event_type='page_view' GROUP BY country ORDER BY visitors DESC LIMIT 10`).all(since);
  const kuwait = db.prepare(`SELECT region, COUNT(DISTINCT visitor_id) visitors FROM analytics_events
    WHERE at >= ? AND event_type='page_view' AND country='Kuwait' GROUP BY region ORDER BY visitors DESC`).all(since);
  const trend = db.prepare(`SELECT date(at, '+3 hours') day, COUNT(CASE WHEN event_type='page_view' THEN 1 END) views,
    COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) visitors FROM analytics_events WHERE at >= ? GROUP BY day ORDER BY day`).all(since);
  const avgMinutes = totals.sessions ? (totals.engagement / totals.sessions / 60000).toFixed(1) : "0.0";
  const maxCountry = Math.max(1, ...countries.map((x) => x.visitors));
  const maxRegion = Math.max(1, ...kuwait.map((x) => x.visitors));
  const day = (value) => value.slice(8) + "/" + value.slice(5, 7);

  return <>
    <Head title="Website Analytics" sub={`Anonymous website activity for the last ${days} days.`}>
      {[7, 30, 90].map((n) => <Link key={n} className={`btn btn-sm ${days === n ? "btn-primary" : "btn-ghost"}`} href={`/admin/analytics/?days=${n}`}>{n} days</Link>)}
    </Head>
    <div className="notice" style={{ display: "block", marginBottom: 16 }}>Tracking stores anonymous IDs and activity only. No names, emails, Civil IDs, or raw IP addresses are saved. Country and governorate may show as Unknown when location cannot be resolved.</div>
    <div className="a-stats">
      <Stat label="Unique visitors" value={totals.visitors || 0} hint={`${totals.sessions || 0} sessions`} tone="up" />
      <Stat label="Page views" value={totals.views || 0} hint={`${pages.length} viewed pages`} />
      <Stat label="Link clicks" value={totals.clicks || 0} hint="all tracked links" />
      <Stat label="Average engagement" value={`${avgMinutes} min`} hint="per session" />
    </div>
    <div className="a-grid">
      <Bars title="Daily visitors" data={trend.map((x) => [day(x.day), x.visitors])} />
      <Bars title="Daily page views" data={trend.map((x) => [day(x.day), x.views])} tone="sun" />
      <Meters title="Visitors by country" rows={countries.map((x) => [x.country || "Unknown", x.visitors, maxCountry])} />
      <Meters title="Kuwait governorates" rows={kuwait.map((x) => [x.region || "Unknown", x.visitors, maxRegion])} />
    </div>
    <section className="a-card" style={{ marginTop: 16 }}><div className="a-card-h"><h2>Most viewed pages</h2></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead><tbody>
      {pages.map((x) => <tr key={x.path}><td className="mono">{x.path || "/"}</td><td>{x.views}</td><td>{x.visitors}</td></tr>)}
      {!pages.length && <tr><td colSpan="3" className="muted">No website activity recorded yet.</td></tr>}
    </tbody></table></div></section>
    <section className="a-card" style={{ marginTop: 16 }}><div className="a-card-h"><h2>Most clicked links</h2></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>Link</th><th>Target</th><th>Clicks</th><th>Visitors</th></tr></thead><tbody>
      {clicks.map((x, i) => <tr key={`${x.target}-${i}`}><td>{x.label || "Link"}</td><td className="mono break">{x.target}</td><td>{x.clicks}</td><td>{x.visitors}</td></tr>)}
      {!clicks.length && <tr><td colSpan="4" className="muted">No link clicks recorded yet.</td></tr>}
    </tbody></table></div></section>
  </>;
}
