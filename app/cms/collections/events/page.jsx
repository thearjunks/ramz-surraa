import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { Head } from "@/components/admin/ui";
import { EVENT_STATUS } from "@/lib/bookings";

export default async function EventCollection({searchParams}) {
  const user = await requirePerm("content"), sp = await searchParams, q = String(sp.q || "").toLowerCase();
  const rows = db.prepare("SELECT e.id,e.name,e.date,e.status,e.is_hidden,s.key AS draft FROM events e LEFT JOIN settings s ON s.key='cms_event_editorial_'||e.id ORDER BY e.date DESC").all().filter((e) => !q || e.name.toLowerCase().includes(q));
  return <><Head title="Events" sub="Edit event names, descriptions and poster images."><Link className="btn btn-ghost" href="/cms/collections/">Collections</Link>
    {can(user,"events") && <Link className="btn btn-ghost" href="/admin/events/new/">Create event in Admin</Link>}</Head>
    <form className="a-inline"><input className="input" aria-label="Search events" name="q" defaultValue={q} placeholder="Search events"/><button className="btn btn-ghost">Search</button></form>
    <div className="a-table-wrap"><table className="a-table"><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Content</th></tr></thead><tbody>{rows.map((e) => <tr key={e.id}><td><Link href={`/cms/collections/events/${e.id}/`}>{e.name}</Link></td><td>{e.date}</td><td>{e.is_hidden ? "Hidden" : EVENT_STATUS[e.status]}</td><td>{e.draft ? "Draft changes" : "Current content"}</td></tr>)}</tbody></table></div></>;
}
