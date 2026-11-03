import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import Icon from "@/components/Icon";
import { Timeline, noindex } from "@/components/blocks";
import { C, src } from "@/lib/site";
import { db } from "@/lib/db";
import { STATUS, fmtDT, fmtDate, fmtTime, eventStart, passesFor } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Entry Pass | SURRAA Community Association", ...noindex };

// The access token in the URL is a 192-bit secret given only to the person who made the request
// (after submitting, via tracking verification, or in their account).
export default async function EntryPass({ params, searchParams }) {
  const b = db.prepare("SELECT * FROM bookings WHERE access_token = ?").get((await params).token);
  if (!b) notFound();
  const e = db.prepare("SELECT * FROM events WHERE id = ?").get(b.event_id);
  const confirmed = ["confirmed", "checked_in"].includes(b.status);
  const passes = confirmed ? passesFor(b.id).filter((p) => p.status === "valid") : [];
  const qrs = await Promise.all(passes.map((p) => QRCode.toDataURL(p.token, { margin: 1, width: 360 })));
  const isNew = (await searchParams).new;
  const date = fmtDate(eventStart(e));

  return (
    <section className="section" style={{ paddingTop: "calc(var(--hh,80px) + 40px)" }}>
      <div className="wrap" style={{ maxWidth: 980 }}>
        {isNew && <div className="m-banner" style={{ marginBottom: 24 }}><Icon name="star" /><span><b>Thank you for requesting your entry pass.</b> Your request has been received successfully and is currently awaiting confirmation. Our team will contact you shortly regarding the next steps. You can track your request using your booking reference number.</span></div>}

        {!confirmed ? (
          <article className="ack">
            <div className="ack-top" style={{ backgroundImage: e.poster ? `linear-gradient(180deg,rgba(8,10,8,.55),var(--night)),url(${src(e.poster)})` : undefined }}>
              <img src="/images/surraa-logo.png" alt="" className="ack-logo" />
              <small>{C.name}</small>
              <h2>Entry pass request</h2>
              <span className={"pill " + (["rejected", "cancelled", "expired"].includes(b.status) ? "past" : "warn")}>{STATUS[b.status]}</span>
            </div>
            <dl className="ack-grid">
              <div><dt>Event</dt><dd>{e.name}</dd></div>
              <div><dt>Booking reference</dt><dd className="ref">{b.ref}</dd></div>
              <div><dt>Event date</dt><dd>{date}</dd></div>
              <div><dt>Requested passes</dt><dd>{b.quantity}</dd></div>
            </dl>
            <p className="ack-warn"><b>This is not an official entry pass and does not authorise admission.</b> Official passes with QR codes are issued only after confirmation.</p>
          </article>
        ) : (
          <>
            <div className="section-head" style={{ marginBottom: 20 }}><div><span className="kicker">{b.ref}</span><h1 style={{ fontSize: "clamp(36px,5vw,60px)" }}>Your <span className="grad">entry passes</span></h1></div>
              <a className="btn btn-primary" href={`/entry-pass-pdf/${b.access_token}/`}><Icon name="ticket" />Download PDF</a></div>
            <div className="passes">
              {passes.map((p, i) => (
                <article key={p.id} className="epass">
                  <div className="epass-top" style={{ backgroundImage: e.poster ? `linear-gradient(180deg,rgba(8,10,8,.4),var(--night)),url(${src(e.poster)})` : undefined }}>
                    <img src="/images/surraa-logo.png" alt="" className="ack-logo" />
                    <small>Official entry pass · {i + 1} of {passes.length}</small>
                    <h2>{e.name}</h2>
                    <span className="pill up">{p.checked_in_at ? "Checked in" : "Confirmed"}</span>
                  </div>
                  <div className="epass-body">
                    <img className="qr" src={qrs[i]} alt={"QR code for pass " + p.serial} />
                    <dl>
                      <div><dt>Pass holder</dt><dd>{p.holder}</dd></div>
                      <div><dt>Date</dt><dd>{date}</dd></div>
                      <div><dt>Time</dt><dd>{fmtTime(e.start_time)}</dd></div>
                      <div><dt>Venue</dt><dd>{e.venue}</dd></div>
                      <div><dt>Event ID</dt><dd>{e.event_code}</dd></div>
                    </dl>
                  </div>
                  <div className="epass-foot"><span className="ref">{p.serial}</span><small>Issued {fmtDT(p.issued_at)} · Admits one, once</small></div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="card" style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 18 }}>Status</h3>
          <Timeline status={b.status} />
          <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>Last updated {fmtDT(b.updated_at)} (Kuwait time)</p>
        </div>

        <div className="card" id="details" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Request details</h3>
          <dl className="ack-grid" style={{ padding: 0 }}>
            <div><dt>Name</dt><dd>{b.name}</dd></div><div><dt>Mobile</dt><dd>{b.mobile}</dd></div>
            <div><dt>Email</dt><dd>{b.email}</dd></div><div><dt>Nationality</dt><dd>{b.nationality}</dd></div>
            <div><dt>Venue</dt><dd>{e.venue}, {e.area}</dd></div><div><dt>Submitted</dt><dd>{fmtDT(b.created_at)}</dd></div>
          </dl>
        </div>

        <div className="btn-row" style={{ marginTop: 24 }}>
          <Link className="btn btn-primary" href="/track-entry-pass/"><Icon name="search" />Track my pass</Link>
          <a className="btn btn-ghost" href={`/entry-pass-pdf/${b.access_token}/`}><Icon name="ticket" />{confirmed ? "Download passes (PDF)" : "Download acknowledgement (PDF)"}</a>
          <Link className="btn btn-ghost" href={`/events/${e.slug}/`}>Return to event</Link>
        </div>
        <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>Keep this page private — anyone with this link can see your request. Bookmark it or use “Track Entry Pass” later.</p>
      </div>
    </section>
  );
}
