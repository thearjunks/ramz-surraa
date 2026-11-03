"use client";
import { useRef, useState } from "react";
import Icon from "./Icon";
import { C, M } from "@/lib/site";
import { useSiteContent } from "./SiteContentProvider";

const PHONE = /^\+?[\d\s-]{8,}$/;

// Membership registration. Always ends with a WhatsApp message to the association (so nothing is lost
// without a server). If company.formEndpoint (Formspree) is set, the registration is also emailed.
// ponytail: no database yet — add a backend (or reuse the old PHP/Excel booking system) when you need a members list on the site.
export default function MembershipForm() {
  const content = useSiteContent();
  const company = content?.company || C;
  const membership = content?.membership || M;
  const form = useRef(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [sending, setSending] = useState(false);

  async function submit(ev) {
    ev.preventDefault();
    const el = form.current;
    if (el.elements.website.value) return; // honeypot for bots
    let ok = true;
    el.querySelectorAll("[required]").forEach((inp) => {
      const v = inp.value.trim();
      const bad = inp.type === "checkbox" ? !inp.checked : !v || (inp.name === "whatsapp" && !PHONE.test(v));
      inp.closest(".field").classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    if (!ok) { setErr("Please complete the highlighted fields."); el.querySelector(".invalid input")?.focus(); return; }
    setErr("");

    const d = Object.fromEntries(["name", "whatsapp", "nationality", "area"].map((k) => [k, el.elements[k].value.trim()]));
    const ref = "SUR-M-" + Date.now().toString(36).toUpperCase().slice(-6);
    const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" });

    if (company.formEndpoint) {
      setSending(true);
      try {
        await fetch(company.formEndpoint, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ _subject: "New membership registration " + ref, reference: ref, ...d, submitted: when + " (Kuwait)" }) });
      } catch { /* WhatsApp below still carries the registration */ }
      setSending(false);
    }
    const msg = [`*${company.name.toUpperCase()} – NEW MEMBERSHIP*`, `Reference: ${ref}`, `Name: ${d.name}`, `WhatsApp: ${d.whatsapp}`,
      `Nationality: ${d.nationality}`, `Area in Kuwait: ${d.area}`, `Submitted: ${when} (Kuwait time)`].join("\n");
    setDone({ ref, name: d.name, wa: "https://wa.me/" + membership.whatsapp + "?text=" + encodeURIComponent(msg) });
    el.reset();
  }

  if (done) return (
    <div className="m-done">
      <span className="icon-disc"><Icon name="star" /></span>
      <h3>Thank you, {done.name.split(" ")[0]}!</h3>
      <p className="muted">Your reference: <b style={{ color: "var(--volt)" }}>{done.ref}</b></p>
      <p><b>Last step:</b> send your registration to us on WhatsApp. {membership.paymentNote}</p>
      <a className="btn btn-primary" href={done.wa} target="_blank" rel="noopener"><Icon name="wa" />Send on WhatsApp</a>
      <button className="btn btn-ghost" onClick={() => setDone(null)}>Register someone else</button>
    </div>
  );

  return (
    <form ref={form} className="form m-form" noValidate onSubmit={submit}>
      <div className="field full"><label htmlFor="m-name">Full name *</label><input id="m-name" className="input" name="name" required autoComplete="name" /><p className="err-msg">Please enter your name.</p></div>
      <div className="field full"><label htmlFor="m-wa">Contact / WhatsApp number *</label><input id="m-wa" className="input" type="tel" name="whatsapp" required autoComplete="tel" placeholder="+965 5xxx xxxx" /><p className="err-msg">Please enter a valid number.</p></div>
      <div className="field"><label htmlFor="m-nat">Nationality *</label><input id="m-nat" className="input" name="nationality" required list="nat-list" autoComplete="off" /><p className="err-msg">Please enter your nationality.</p></div>
      <div className="field"><label htmlFor="m-area">Area in Kuwait *</label><input id="m-area" className="input" name="area" required list="area-list" autoComplete="off" /><p className="err-msg">Please enter your area.</p></div>
      <datalist id="nat-list">{(membership.nationalities || []).map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="area-list">{(membership.areas || []).map((n) => <option key={n} value={n} />)}</datalist>
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field full"><label className="consent" style={{ fontSize: 13 }}><input type="checkbox" name="consent" required /> I agree that {company.name} may keep these details to contact me about membership and events. *</label><p className="err-msg">Please tick to continue.</p></div>
      <div className="full"><button className="btn btn-primary" type="submit" disabled={sending} style={{ width: "100%" }}>{sending ? "Sending…" : "Register"} <Icon name="arrow" /></button></div>
      {err && <div className="notice err full" role="status">{err}</div>}
    </form>
  );
}
