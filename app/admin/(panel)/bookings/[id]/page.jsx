import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { Head, StatusTag, PayTag, kd } from "@/components/admin/ui";
import { CivilReveal, ConfirmButton } from "@/components/admin/Client";
import { db } from "@/lib/db";
import { requirePerm, can, siteUrl } from "@/lib/auth";
import { STATUS, ADMIN_SETTABLE, fmtDT, fmtDate, eventStart, passesFor, historyFor, eventStats } from "@/lib/bookings";
import { maskCivil, decrypt } from "@/lib/security";
import { PAYMENT_STATUS, PAYMENT_METHODS } from "@/lib/admin-query";
import { waLink } from "@/lib/notify";
import { holdersForBooking, holderName } from "@/lib/pass-holders";
import { updateStatus, savePayment, saveNotes, editBooking, deleteBooking, resendConfirmation, retryNotification, reissue } from "@/lib/admin-actions";

export default async function Booking({ params, searchParams }) {
  const u = await requirePerm("bookings.view");
  const b = db.prepare(`SELECT b.*, us.membership_id, cu.name confirmed_by_name FROM bookings b LEFT JOIN users us ON us.id = b.user_id
    LEFT JOIN users cu ON cu.id = b.confirmed_by WHERE b.id = ?`).get(Number((await params).id));
  if (!b) notFound();
  const e = db.prepare("SELECT * FROM events WHERE id = ?").get(b.event_id);
  const address = b.address_enc ? JSON.parse(decrypt(b.address_enc)) : null;
  const pay = db.prepare("SELECT * FROM payments WHERE booking_id = ?").get(b.id) || { rate: e.internal_rate, total: e.internal_rate * b.quantity, status: "unpaid", received: 0 };
  const passes = passesFor(b.id), hist = historyFor(b.id);
  const holders = holdersForBooking(b);
  const notes = db.prepare("SELECT * FROM notifications WHERE booking_id = ? ORDER BY id DESC").all(b.id);
  const s = eventStats(e.id);
  const sp = await searchParams;
  const update = can(u, "bookings.update");
  const statusOptions = ADMIN_SETTABLE.filter((k) => k !== b.status && (k !== "confirmed" || can(u, "bookings.confirm"))).map((k) => [k, STATUS[k]]);
  const pdfUrl = `${await siteUrl()}/entry-pass-pdf/${b.access_token}/`;
  const msg = `Hello ${b.name}, greetings from SURRAA Community Association.\n\nYour ${passes.some((p) => p.status === "valid") ? "entry passes" : "entry pass request"} for ${e.name}:\nTracking number: ${b.ref}\nMobile: ${b.mobile}\nPDF: ${pdfUrl}\n\n${passes.some((p) => p.status === "valid") ? "Each ticket has its own name and QR code. Please show the PDF at the entrance." : "This PDF is an acknowledgement. Official QR tickets will be available after confirmation."}`;

  return (
    <>
      <Head title={b.ref} sub={`${e.event_code} · ${e.name} · ${fmtDate(eventStart(e))}`}>
        <Link className="btn btn-ghost" href="/admin/bookings/">← All bookings</Link>
        {passes.some((p) => p.status === "valid") && <a className="btn btn-ghost" href={`/entry-pass-pdf/${b.access_token}/?download=1`}><Icon name="ticket" />Download passes</a>}
        {can(u, "bookings.delete") && <form action={deleteBooking}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="confirm" value={b.ref} />
          <ConfirmButton className="btn btn-ghost" message={`Permanently delete ${b.ref} and its passes, payment, history and notification records? This cannot be undone.`}>Delete booking</ConfirmButton></form>}
      </Head>
      {sp.sent && <div className="notice ok" style={{ display: "block", marginBottom: 14 }}>Notification sent (see log below).</div>}

      <div className="a-cols">
        <div className="stack">
          <section className="a-card">
            <div className="a-card-h"><h2>Request</h2><StatusTag s={b.status} /></div>
            <dl className="a-dl">
              <div><dt>Customer</dt><dd>{b.name}</dd></div>
              <div><dt>Type</dt><dd>{b.user_type === "member" ? `Member · ${b.membership_id}` : "Guest"}</dd></div>
              <div><dt>Mobile</dt><dd>{b.mobile}</dd></div><div><dt>Email</dt><dd>{b.email}</dd></div>
              <div><dt>Nationality</dt><dd>{b.nationality}</dd></div>
              {address && <div><dt>Current Kuwait address</dt><dd>{[address.building, address.street, address.block, address.location, address.city].filter(Boolean).join(", ")}</dd></div>}
              <div><dt>Civil ID</dt><dd><CivilReveal id={b.id} masked={maskCivil(b.civil_last4)} allowed={can(u, "civil.view")} /></dd></div>
              <div><dt>Passes requested</dt><dd>{b.quantity}</dd></div>
              <div><dt>Ticket names</dt><dd>{holders.map((h, i) => <span key={i} style={{ display: "block" }}>{i + 1}. {holderName(h)}</span>)}</dd></div>
              <div><dt>Submitted</dt><dd>{fmtDT(b.created_at)}</dd></div>
              <div><dt>Source page</dt><dd className="break">{b.page_url || "—"}</dd></div>
              <div><dt>Confirmed</dt><dd>{b.confirmed_at ? `${fmtDT(b.confirmed_at)} · ${b.confirmed_by_name || ""}` : "—"}</dd></div>
            </dl>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <a className="btn btn-ghost btn-sm" href={waLink(b.mobile, msg)} target="_blank" rel="noopener"><Icon name="wa" />WhatsApp</a>
              <a className="btn btn-ghost btn-sm" href={"tel:" + b.mobile}><Icon name="phone" />Call</a>
              <a className="btn btn-ghost btn-sm" href={`mailto:${b.email}?subject=${encodeURIComponent("Your entry pass request " + b.ref)}`}><Icon name="mail" />Email</a>
              {update && <form action={resendConfirmation}><input type="hidden" name="id" value={b.id} /><button className="btn btn-ghost btn-sm">Resend status email</button></form>}
            </div>
          </section>

          {update && <section className="a-card">
            <h2>Update status</h2>
            <p className="muted" style={{ fontSize: 14 }}>Event capacity: {s.used} of {e.capacity - e.reserved} requested · {s.available} available. Confirming generates official passes with unique serials and QR codes.</p>
            {b.status === "checked_in" ? <p className="muted">Checked in — no further changes.</p> :
              <ActionForm action={updateStatus} submit="Update status" hidden={{ id: b.id }} fields={[
                { name: "status", label: "New status", type: "select", required: true, options: statusOptions, full: true },
                { name: "remarks", label: "Administrator remarks", type: "textarea", full: true },
                { name: "notify", type: "checkbox", label: "Email the customer about this change (confirmation always emails the QR ticket PDF)", defaultValue: true },
              ]} />}
          </section>}

          {can(u, "payments") && <section className="a-card">
            <div className="a-card-h"><h2>Internal payment</h2><PayTag s={pay.status} /></div>
            <p className="muted" style={{ fontSize: 14 }}>Admin only — never shown to customers. Total = rate × {b.quantity} passes = <b>{kd(pay.total)}</b> · received {kd(pay.received)} · outstanding <b>{kd(Math.max(0, pay.total - pay.received))}</b></p>
            <ActionForm action={savePayment} submit="Save payment" className="form m-form" hidden={{ id: b.id }} fields={[
              { name: "rate", label: "Rate per pass (KD)", type: "number", defaultValue: pay.rate, min: 0 },
              { name: "received", label: "Amount received (KD)", type: "number", defaultValue: pay.received, min: 0 },
              { name: "status", label: "Payment status", type: "select", options: Object.entries(PAYMENT_STATUS), defaultValue: pay.status, hint: "Leave as is to calculate from the amounts." },
              { name: "method", label: "Payment method", type: "select", options: PAYMENT_METHODS, defaultValue: pay.method },
              { name: "payment_date", label: "Payment date", type: "date", defaultValue: pay.payment_date },
              { name: "reference", label: "Payment reference", defaultValue: pay.reference },
              { name: "remarks", label: "Remarks", type: "textarea", defaultValue: pay.remarks, full: true },
            ]} />
          </section>}
        </div>

        <div className="stack">
          <section className="a-card">
            <h2>Official passes</h2>
            {passes.length ? (
              <table className="a-table compact"><thead><tr><th>Serial</th><th>Status</th><th>Checked in</th><th></th></tr></thead><tbody>
                {passes.map((p) => <tr key={p.id}><td className="mono">{p.serial}<br /><small>{p.holder}</small></td><td>{p.status === "valid" ? "Valid" : "Revoked"}</td><td>{p.checked_in_at ? fmtDT(p.checked_in_at) : "—"}</td>
                  <td>{can(u, "bookings.confirm") && p.status === "valid" && !p.checked_in_at && <form action={reissue}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="pass" value={p.id} />
                    <ConfirmButton className="btn btn-ghost btn-sm" message={`Reissue ${p.serial}? The old QR code will stop working.`}>Reissue QR</ConfirmButton></form>}</td></tr>)}
              </tbody></table>
            ) : <p className="muted">No passes yet — they are generated when the booking is confirmed.</p>}
            <p style={{ marginTop: 10, fontSize: 13 }}><span className="muted">Customer link:</span> <a href={`/entry-pass/${b.access_token}/`} target="_blank" rel="noopener" style={{ color: "var(--volt)" }}>view as customer</a></p>
          </section>

          {update && <section className="a-card">
            <h2>Internal notes</h2>
            <form action={saveNotes} className="form"><input type="hidden" name="id" value={b.id} />
              <div className="field full"><textarea className="input" name="notes" defaultValue={b.notes} aria-label="Internal notes" /></div>
              <div className="full"><button className="btn btn-ghost btn-sm">Save notes</button></div></form>
          </section>}

          {update && <details className="a-card"><summary><h2 style={{ display: "inline" }}>Edit details</h2></summary>
            <ActionForm action={editBooking} submit="Save details" className="form m-form" hidden={{ id: b.id }} fields={[
              { name: "name", label: "Name", required: true, defaultValue: b.name, full: true },
              { name: "mobile", label: "Mobile", required: true, defaultValue: b.mobile }, { name: "email", label: "Email", required: true, defaultValue: b.email },
              { name: "nationality", label: "Nationality", required: true, defaultValue: b.nationality },
              { name: "quantity", label: "Passes", type: "number", min: 1, max: e.max_per_booking, defaultValue: b.quantity, hint: "Only before confirmation." },
              { name: "pass_holders", type: "pass_holders", holders },
            ]} />
          </details>}

          <section className="a-card">
            <h2>Status history</h2>
            <ol className="a-hist">{hist.map((h) => <li key={h.id}><b>{h.from_status ? `${STATUS[h.from_status]} → ` : ""}{STATUS[h.to_status]}</b><small>{fmtDT(h.at)} · {h.by_name || (h.by_user ? "#" + h.by_user : "System / customer")}</small>{h.remarks && <p>{h.remarks}</p>}</li>)}</ol>
          </section>

          <section className="a-card">
            <h2>Notifications</h2>
            {notes.length ? <ul className="a-hist">{notes.map((n) => <li key={n.id}><b>{n.channel} · {n.status}</b><small>{fmtDT(n.at)} · {n.recipient}</small>{n.error && <p className="muted">{n.error}</p>}
              {["failed", "logged"].includes(n.status) && n.channel === "whatsapp" && <div className="btn-row"><a className="btn btn-ghost btn-sm" href={waLink(n.recipient, n.body)} target="_blank" rel="noopener"><Icon name="wa" />Send manually</a>
                {n.status === "failed" && <form action={retryNotification}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="back" value={`/admin/bookings/${b.id}/`} /><button className="btn btn-ghost btn-sm">Retry</button></form>}</div>}</li>)}</ul>
              : <p className="muted">None.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
