import Link from "next/link";
import Icon from "@/components/Icon";
import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { eventStats, eventState, EVENT_STATUS, fmtDate, eventStart } from "@/lib/bookings";
import { toggleEventVisibility } from "@/lib/admin-actions";

export default async function Events() {
  await requirePerm("events");
  const events = db.prepare("SELECT * FROM events ORDER BY date DESC").all();
  return (
    <>
      <Head title="Events" sub="Each event keeps its own capacity, requests and pass serials."><Link className="btn btn-primary" href="/admin/events/new/"><Icon name="cal" />New event</Link></Head>
      <div className="a-table-wrap"><table className="a-table">
        <thead><tr><th>Event ID</th><th>Event</th><th>Date</th><th>Admin status</th><th>Visibility</th><th>Public status</th><th>Capacity</th><th>Requested</th><th>Confirmed</th><th>Available</th><th>Checked in</th><th></th></tr></thead>
        <tbody>{events.map((e) => { const s = eventStats(e.id); return (
          <tr key={e.id}><td className="mono strong">{e.event_code}</td><td>{e.name}</td><td className="nowrap">{fmtDate(eventStart(e))}</td><td>{EVENT_STATUS[e.status]}</td>
            <td>{e.is_hidden ? "Hidden" : "Visible"}</td><td>{e.is_hidden ? "Hidden" : EVENT_STATUS[eventState(e, s).key]}</td><td>{e.capacity}{e.reserved ? ` (−${e.reserved})` : ""}</td><td>{s.used}</td><td>{s.confirmed}</td><td>{s.available}</td><td>{s.checkedIn}</td>
            <td className="nowrap"><Link className="btn btn-ghost btn-sm" href={`/admin/events/${e.id}/`}>Edit</Link> <Link className="btn btn-ghost btn-sm" href={`/admin/bookings/?event=${e.id}`}>Bookings</Link> <form action={toggleEventVisibility} style={{ display: "inline" }}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm" type="submit">{e.is_hidden ? "Show" : "Hide"}</button></form></td></tr>); })}</tbody>
      </table></div>
    </>
  );
}
