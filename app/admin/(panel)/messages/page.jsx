import { Head } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";

export default async function Messages() {
  await requirePerm("settings");
  const rows = db.prepare("SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100").all();
  return <>
    <Head title="Contact messages" sub={`${rows.length} most recent enquiries`} />
    {rows.length ? rows.map((row) => <section className="a-card" key={row.id} style={{ marginBottom: 16 }}>
      <h2>{row.subject}</h2>
      <p><b>{row.name}</b> · <a href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}>{row.phone}</a> · {fmtDT(row.created_at)}</p>
      <p style={{ whiteSpace: "pre-wrap" }}>{row.message}</p>
    </section>) : <p>No messages yet.</p>}
  </>;
}
