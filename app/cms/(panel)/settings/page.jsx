import Link from "next/link";
import Icon from "@/components/Icon";
import ActionForm from "@/components/ActionForm";
import { Head, Tabs, Empty } from "@/components/cms/ui";
import { db, setting } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";
import { waLink } from "@/lib/notify";
import { saveSettings, retryNotification } from "@/lib/admin-actions";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }) {
  await requirePerm("settings");
  const sp = await searchParams;
  const tab = sp.tab === "log" ? "log" : "notify";
  const hasToken = !!setting("wa_token");
  const failed = db.prepare("SELECT COUNT(*) n FROM notifications WHERE status = 'failed'").get().n;
  const notes = tab === "log" ? db.prepare(`SELECT * FROM notifications ${sp.only === "failed" ? "WHERE status = 'failed'" : ""} ORDER BY id DESC LIMIT 80`).all() : [];
  return (
    <>
      <Head title="Settings" sub="How the system sends WhatsApp messages and emails." />
      <Tabs items={[{ t: "Notifications", h: "/cms/settings/", on: tab === "notify" }, { t: "Message log", h: "/cms/settings/?tab=log", on: tab === "log", n: failed || undefined }]} />
      {tab === "notify" ? (
        <div className="cols even">
          <section className="k-card">
            <div className="card-h"><h2><Icon name="wa" />WhatsApp alerts</h2>{hasToken ? <span className="pill up">Automatic</span> : <span className="pill warn">Manual sending</span>}</div>
            <p className="muted small" style={{ marginBottom: 14 }}>Every new entry pass request is sent to the admin WhatsApp number. Without a WhatsApp Business API token, each message waits in the Message log with a one-click “Send manually” button. Civil IDs are never sent.</p>
            <ActionForm action={saveSettings} submit="Save settings" fields={[
              { name: "admin_whatsapp", label: "Admin WhatsApp number", defaultValue: setting("admin_whatsapp", "96566247474"), full: true, hint: "Digits only, including 965 — e.g. 96566247474" },
              { type: "section", label: "Automatic sending (optional)", hint: "From Meta for Developers → WhatsApp → API setup." },
              { name: "wa_phone_id", label: "Phone number ID", defaultValue: setting("wa_phone_id"), full: true },
              { name: "wa_token", label: "Access token", type: "password", placeholder: hasToken ? "Saved — type a new one to replace it" : "Paste the token here", full: true },
              ...(hasToken ? [{ name: "clear_token", type: "checkbox", label: "Remove the saved token (go back to manual sending)" }] : []),
            ]} />
          </section>
          <section className="k-card">
            <div className="card-h"><h2><Icon name="mail" />Email</h2>{process.env.SMTP_HOST ? <span className="pill up">Connected</span> : <span className="pill warn">Not set up</span>}</div>
            {process.env.SMTP_HOST ? <p className="small">Emails are sent through <b>{process.env.SMTP_HOST}</b>.</p> : <>
              <p className="small">Customer emails (confirmations, password resets) are not being sent yet — they are saved in the Message log instead.</p>
              <p className="muted small" style={{ marginTop: 10 }}>To switch on email, your web developer adds these to the <code>.env.local</code> file on the server and restarts the site:</p>
              <pre>SMTP_HOST=smtp.yourprovider.com{"\n"}SMTP_PORT=587{"\n"}SMTP_USER=you@surraa.com{"\n"}SMTP_PASS=…{"\n"}MAIL_FROM=SURRAA &lt;you@surraa.com&gt;</pre></>}
          </section>
        </div>
      ) : (
        <section className="k-card">
          <div className="card-h"><h2>Messages sent by the system</h2><nav className="chips" style={{ margin: 0 }}><Link href="/cms/settings/?tab=log" aria-current={sp.only !== "failed" ? "page" : undefined}>All</Link><Link href="/cms/settings/?tab=log&only=failed" aria-current={sp.only === "failed" ? "page" : undefined}>Failed · {failed}</Link></nav></div>
          {notes.length ? <ol className="k-timeline">{notes.map((n) => (
            <li key={n.id} className={n.channel === "whatsapp" ? "" : "n"}>
              <b>{n.channel === "whatsapp" ? "WhatsApp" : "Email"} to {n.recipient} <span className={"pill " + (n.status === "sent" ? "up" : n.status === "failed" ? "err" : "warn")}>{n.status === "logged" ? "Waiting — send manually" : n.status}</span></b>
              <small>{fmtDT(n.at)}{n.subject ? " · " + n.subject : ""}{n.booking_id ? <> · <Link className="linkish" href={`/cms/bookings/${n.booking_id}/`}>open booking</Link></> : null}</small>
              {n.error && <p className="muted">{n.error}</p>}
              <details><summary className="linkish small" style={{ cursor: "pointer", marginTop: 4 }}>Show message</summary><pre>{n.body}</pre></details>
              {n.status !== "sent" && <div className="row" style={{ marginTop: 6 }}>
                {n.channel === "whatsapp" && <a className="btn btn-sm" href={waLink(n.recipient, n.body)} target="_blank" rel="noopener"><Icon name="wa" />Send manually</a>}
                {n.status === "failed" && <form action={retryNotification}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="back" value="/cms/settings/?tab=log" /><button className="btn btn-sm"><Icon name="refresh" />Try again</button></form>}</div>}
            </li>))}</ol> : <Empty title="No messages yet" />}
        </section>
      )}
    </>
  );
}
