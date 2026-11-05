import ActionForm from "@/components/ActionForm";
import { Head } from "@/components/admin/ui";
import { db, setting } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { fmtDT } from "@/lib/bookings";
import { waLink } from "@/lib/notify";
import { saveSettings, retryNotification } from "@/lib/admin-actions";

export default async function Settings() {
  await requirePerm("settings");
  const notes = db.prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT 50").all();
  const hasToken = !!setting("wa_token");
  const graphMail = process.env.MAIL_PROVIDER !== "smtp" && !!(process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET);
  return (
    <>
      <Head title="Settings" sub="Notifications and system configuration." />
      <div className="a-cols">
        <section className="a-card">
          <h2>WhatsApp notifications</h2>
          <p className="muted" style={{ fontSize: 14 }}>New entry pass requests are sent to the admin number. Without a WhatsApp Business API token they are logged below with a one-click “send manually” link. Civil IDs are never sent.</p>
          <ActionForm action={saveSettings} submit="Save settings" fields={[
            { name: "admin_whatsapp", label: "Admin WhatsApp number (digits, with 965)", defaultValue: setting("admin_whatsapp", "96566247474"), full: true },
            { name: "wa_phone_id", label: "WhatsApp Cloud API — Phone number ID", defaultValue: setting("wa_phone_id"), full: true },
            { name: "wa_token", label: "WhatsApp Cloud API — Access token", type: "password", placeholder: hasToken ? "Saved — enter a new one to replace" : "From Meta for Developers", full: true },
            ...(hasToken ? [{ name: "clear_token", type: "checkbox", label: "Remove saved token" }] : []),
          ]} />
          <h2 style={{ marginTop: 26 }}>Email</h2>
          <p className="muted" style={{ fontSize: 14 }}>Email is {graphMail ? <b>configured (Microsoft Graph)</b> : process.env.SMTP_HOST ? <b>configured ({process.env.SMTP_HOST})</b> : <b>not configured</b>}. Customer mail is sent from <b>{process.env.MAIL_FROM || process.env.SMTP_USERNAME || "info@surraa.com"}</b>. Failed deliveries remain in the log below and can be retried.</p>
        </section>
        <section className="a-card">
          <h2>Notification log</h2>
          <ul className="a-hist">{notes.map((n) => (
            <li key={n.id}><b>{n.channel} · {n.status}</b><small>{fmtDT(n.at)} · {n.recipient}{n.subject ? " · " + n.subject : ""}</small>
              {n.error && <p className="muted">{n.error}</p>}
              <details><summary className="muted" style={{ cursor: "pointer" }}>Message</summary><pre className="a-pre">{n.body}</pre></details>
              {n.status !== "sent" && <div className="btn-row">
                {n.channel === "whatsapp" && <a className="btn btn-ghost btn-sm" href={waLink(n.recipient, n.body)} target="_blank" rel="noopener">Send manually</a>}
                {n.status === "failed" && <form action={retryNotification}><input type="hidden" name="id" value={n.id} /><button className="btn btn-ghost btn-sm">Retry</button></form>}</div>}
            </li>))}
            {!notes.length && <li className="muted">No notifications yet.</li>}</ul>
        </section>
      </div>
    </>
  );
}
