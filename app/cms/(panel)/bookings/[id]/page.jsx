import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { Head, StatusTag, PayTag, kd, S_LABEL } from "@/components/cms/ui";
import { CivilReveal, ConfirmButton, QuickStatus } from "@/components/cms/Client";
import { db } from "@/lib/db";
import { requirePerm, can, siteUrl } from "@/lib/auth";
import { fmtDT, fmtDate, eventStart, passesFor, historyFor, eventStats } from "@/lib/bookings";
import { maskCivil, decrypt } from "@/lib/security";
import { PAYMENT_STATUS, PAYMENT_METHODS } from "@/lib/admin-query";
import { waLink } from "@/lib/notify";
import { savePayment, saveNotes, editBooking, resendConfirmation, retryNotification, reissue } from "@/lib/admin-actions";
import { holdersForBooking, holderName } from "@/lib/pass-holders";

export const metadata = { title: "Booking" };
const OPEN = ["pending", "under_review", "contacted", "awaiting"];
const CLOSED = ["rejected", "cancelled", "expired"];

function Steps({ status }) {
  const order = ["pending", "review", "confirmed", "checked_in"];
  const at = status === "pending" ? 0 : OPEN.includes(status) ? 1 : status === "confirmed" ? 2 : status === "checked_in" ? 3 : -1;
  const L = ["Request received", "In progress", "Confirmed · passes issued", "Checked in"];
  if (at < 0) return null;
  return (
    <div className="k-steps" aria-label="Progress">
      {order.map((k, i) => <div key={k} className={"k-step " + (i < at || (i === at && i === 3) ? "done" : i === at ? "now" : "")}><i>{i < at || (i === at && i === 3) ? "✓" : i + 1}</i>{L[i]}</div>)}
    </div>
  );
}

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
  const notes = db.prepare("SELECT * FROM notifications WHERE booking_id = ? ORDER BY id").all(b.id);
  const s = eventStats(e.id);
  const sp = await searchParams;
  const update = can(u, "bookings.update"), confirmOk = can(u, "bookings.confirm");
  const pdfUrl = `${await siteUrl()}/entry-pass-pdf/${b.access_token}/`;
  const msg = `Hello ${b.name}, greetings from SURRAA Community Association.\n\nYour ${passes.some((p) => p.status === "valid") ? "entry passes" : "entry pass request"} for ${e.name}:\nTracking number: ${b.ref}\nMobile: ${b.mobile}\nPDF: ${pdfUrl}\n\n${passes.some((p) => p.status === "valid") ? "Each ticket has its own name and QR code. Please show the PDF at the entrance." : "This PDF is an acknowledgement. Official QR tickets will be available after confirmation."}`;

  // which actions make sense right now
  let actions = [];
  if (OPEN.includes(b.status)) {
    if (confirmOk) actions.push({ s: "confirmed", l: `Confirm & issue ${b.quantity} pass${b.quantity > 1 ? "es" : ""}`, primary: true });
    if (b.status !== "under_review") actions.push({ s: "under_review", l: "Mark under review" });
    if (b.status !== "contacted") actions.push({ s: "contacted", l: "Mark contacted" });
    if (b.status !== "awaiting") actions.push({ s: "awaiting", l: "Waiting for customer" });
    actions.push({ s: "rejected", l: "Reject", danger: true }, { s: "cancelled", l: "Cancel", danger: true });
  } else if (b.status === "confirmed") actions = [{ s: "cancelled", l: "Cancel booking", danger: true }];
  else if (CLOSED.includes(b.status)) actions = [{ s: "under_review", l: "Reopen request" }];

  // one timeline: status changes + messages
  const timeline = [
    ...hist.map((h) => ({ at: h.at, n: false, t: (h.from_status ? `${S_LABEL[h.from_status]} → ` : "") + S_LABEL[h.to_status], by: h.by_name || (h.by_user ? "#" + h.by_user : "Customer / system"), p: h.remarks })),
    ...notes.map((n) => ({ at: n.at, n: true, id: n.id, t: `${n.channel === "whatsapp" ? "WhatsApp" : "Email"} ${n.status}`, by: n.recipient, p: n.subject || n.error, raw: n })),
  ].sort((a, b2) => a.at.localeCompare(b2.at));

  return (
    <>
      <Head title={b.name} back={["/cms/bookings/", "Booking requests"]} sub={<><span className="mono">{b.ref}</span> · {e.name} · {fmtDate(eventStart(e))}</>}>
        <StatusTag s={b.status} />
        {passes.some((p) => p.status === "valid") && <a className="btn" href={`/entry-pass-pdf/${b.access_token}/`}><Icon name="download" />Passes PDF</a>}
        <a className="btn" href={`/entry-pass/${b.access_token}/`} target="_blank" rel="noopener"><Icon name="eye" />Customer view</a>
      </Head>
      {sp.sent && <div className="notice ok" style={{ marginBottom: 14 }}>Message sent to the customer.</div>}
      <Steps status={b.status} />
      {CLOSED.includes(b.status) && <div className="notice warn" style={{ marginBottom: 16 }}>This request is <b>{S_LABEL[b.status].toLowerCase()}</b>. Its seats have been released{passes.length ? " and its passes no longer work" : ""}.</div>}

      <div className="cols">
        <div className="k-stack">
          {update && actions.length > 0 && (
            <section className="k-card next">
              <div className="card-h" style={{ marginBottom: 4 }}><h2><Icon name="check" />Next step</h2><span className="muted small">{s.available} of {e.capacity - e.reserved} passes still available</span></div>
              <p className="muted small">{OPEN.includes(b.status) ? "Confirm when everything is in order — this creates the official passes. Or move the request along with one click." : b.status === "confirmed" ? "This booking is confirmed. Cancel only if the customer is no longer attending." : "You can reopen this request if it was closed by mistake."}</p>
              <QuickStatus id={b.id} actions={actions} />
            </section>
          )}

          <section className="k-card">
            <div className="card-h"><h2><Icon name="user" />Customer</h2>{b.user_type === "member" ? <span className="tag">Member · {b.membership_id}</span> : <span className="tag">Guest</span>}</div>
            <dl className="dl">
              <dt>Name</dt><dd>{b.name}</dd>
              <dt>Mobile</dt><dd>{b.mobile}</dd>
              <dt>Email</dt><dd>{b.email}</dd>
              <dt>Nationality</dt><dd>{b.nationality}</dd>
              {address && <><dt>Governorate</dt><dd>{address.governorate || [address.location, address.city].filter(Boolean).join(", ")}</dd></>}
              <dt>Civil ID</dt><dd><CivilReveal id={b.id} masked={maskCivil(b.civil_last4)} allowed={can(u, "civil.view")} /></dd>
              <dt>Passes requested</dt><dd><b>{b.quantity}</b></dd>
              <dt>Ticket names</dt><dd>{holders.map((holder, index) => <span key={index} style={{ display: "block" }}>{index + 1}. {holderName(holder)}</span>)}</dd>
              <dt>Requested on</dt><dd>{fmtDT(b.created_at)}</dd>
              {b.confirmed_at && <><dt>Confirmed</dt><dd>{fmtDT(b.confirmed_at)}{b.confirmed_by_name ? " by " + b.confirmed_by_name : ""}</dd></>}
            </dl>
            <div className="row" style={{ marginTop: 16 }}>
              <a className="btn btn-sm" href={waLink(b.mobile, msg)} target="_blank" rel="noopener"><Icon name="wa" />WhatsApp</a>
              <a className="btn btn-sm" href={"tel:" + b.mobile}><Icon name="phone" />Call</a>
              <a className="btn btn-sm" href={`mailto:${b.email}?subject=${encodeURIComponent("Your entry pass request " + b.ref)}`}><Icon name="mail" />Email</a>
              {update && <form action={resendConfirmation}><input type="hidden" name="id" value={b.id} /><button className="btn btn-sm"><Icon name="refresh" />Resend status email</button></form>}
            </div>
          </section>

          {update && b.status !== "checked_in" && (
            <details className="k-card">
              <summary>Edit customer details</summary>
              <ActionForm action={editBooking} submit="Save details" hidden={{ id: b.id }} fields={[
                { name: "name", label: "Name", required: true, defaultValue: b.name, full: true },
                { name: "mobile", label: "Mobile", required: true, defaultValue: b.mobile }, { name: "email", label: "Email", required: true, defaultValue: b.email },
                { name: "nationality", label: "Nationality", required: true, defaultValue: b.nationality },
                { name: "quantity", label: "Number of passes", type: "number", min: 1, max: e.max_per_booking, defaultValue: b.quantity, hint: "Can only change before the booking is confirmed." },
                { name: "pass_holders", type: "pass_holders", holders },
              ]} />
            </details>
          )}

          {update && (
            <section className="k-card">
              <div className="card-h"><h2><Icon name="edit" />Internal notes</h2><span className="muted small">Only staff can see these</span></div>
              <form action={saveNotes}><input type="hidden" name="id" value={b.id} />
                <textarea name="notes" defaultValue={b.notes} aria-label="Internal notes" placeholder="e.g. Paid cash at the office on 5 Nov" />
                <div className="row" style={{ marginTop: 10 }}><button className="btn btn-sm">Save notes</button></div></form>
            </section>
          )}
        </div>

        <div className="k-stack">
          <section className="k-card">
            <div className="card-h"><h2><Icon name="ticket" />Entry passes</h2><span className="muted small">{passes.filter((p) => p.checked_in_at).length} of {passes.length} used</span></div>
            {passes.length ? (
              <table><tbody>{passes.map((p) => (
                <tr key={p.id}><td className="mono">{p.serial}<br /><small>{p.holder}</small></td>
                  <td>{p.status !== "valid" ? <span className="pill past">Cancelled</span> : p.checked_in_at ? <span className="pill done">Used {fmtDT(p.checked_in_at)}</span> : <span className="pill up">Valid</span>}</td>
                  <td className="num">{confirmOk && p.status === "valid" && !p.checked_in_at && <form action={reissue}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="pass" value={p.id} />
                    <ConfirmButton message={`Replace the QR code for ${p.serial}? The old QR code will stop working.`}>New QR</ConfirmButton></form>}</td></tr>))}
              </tbody></table>
            ) : <p className="muted small">Passes are created automatically when you confirm this booking.</p>}
          </section>

          {can(u, "payments") && (
            <section className="k-card">
              <div className="card-h"><h2><Icon name="card" />Payment</h2><PayTag s={pay.status} /></div>
              <div className="money"><div><small>Total</small><b>{kd(pay.total)}</b></div><div><small>Received</small><b>{kd(pay.received)}</b></div><div><small>Outstanding</small><b>{kd(Math.max(0, pay.total - pay.received))}</b></div></div>
              <p className="muted small">{kd(pay.rate)} per pass × {b.quantity}. Internal only — never shown to customers.</p>
              <details style={{ marginTop: 12 }}><summary className="linkish" style={{ cursor: "pointer" }}>Record or change payment</summary>
                <div style={{ marginTop: 12 }}>
                  <ActionForm action={savePayment} submit="Save payment" hidden={{ id: b.id }} fields={[
                    { name: "received", label: "Amount received (KD)", type: "number", defaultValue: pay.received, min: 0 },
                    { name: "method", label: "Method", type: "select", options: PAYMENT_METHODS, defaultValue: pay.method },
                    { name: "payment_date", label: "Payment date", type: "date", defaultValue: pay.payment_date },
                    { name: "reference", label: "Reference / receipt no.", defaultValue: pay.reference },
                    { name: "rate", label: "Rate per pass (KD)", type: "number", defaultValue: pay.rate, min: 0 },
                    { name: "status", label: "Status", type: "select", options: Object.entries(PAYMENT_STATUS), defaultValue: "", hint: "Leave empty to work it out from the amounts." },
                    { name: "remarks", label: "Remarks", type: "textarea", defaultValue: pay.remarks, full: true },
                  ]} />
                </div></details>
            </section>
          )}

          <section className="k-card">
            <div className="card-h"><h2><Icon name="clock" />History</h2></div>
            <ol className="k-timeline">{timeline.map((t, i) => (
              <li key={i} className={t.n ? "n" : ""}><b>{t.t}</b><small>{fmtDT(t.at)} · {t.by}</small>{t.p && <p>{t.p}</p>}
                {t.raw && ["failed", "logged"].includes(t.raw.status) && t.raw.channel === "whatsapp" && <div className="row" style={{ marginTop: 6 }}>
                  <a className="btn btn-sm" href={waLink(t.raw.recipient, t.raw.body)} target="_blank" rel="noopener"><Icon name="wa" />Send manually</a>
                  {t.raw.status === "failed" && <form action={retryNotification}><input type="hidden" name="id" value={t.raw.id} /><input type="hidden" name="back" value={`/cms/bookings/${b.id}/`} /><button className="btn btn-sm">Retry</button></form>}</div>}
              </li>))}</ol>
            {b.page_url && <p className="muted small break" style={{ marginTop: 6 }}>Requested from: {b.page_url}</p>}
          </section>
        </div>
      </div>
    </>
  );
}
