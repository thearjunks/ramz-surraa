"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { C, isEmail } from "@/lib/site";
import { useSiteContent } from "./SiteContentProvider";

// Shared form shell for the Contact and Sponsorship forms. Fields come in as children.
// Sends to company.formEndpoint (e.g. Formspree) when set, otherwise opens the visitor's email app.
export default function EnquiryForm({ title, children }) {
  const company = useSiteContent()?.company || C;
  const form = useRef(null);
  const [note, setNote] = useState({ cls: "", text: "" });

  // prefill ?type=…&subject=… from links like "Book an artist"
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    for (const k of ["type", "subject"]) { const el = form.current.elements[k]; if (el && q.get(k)) el.value = q.get(k); }
  }, []);

  async function submit(ev) {
    ev.preventDefault();
    const el = form.current;
    if (el.elements.website?.value) return; // honeypot: bots fill hidden field
    let ok = true;
    el.querySelectorAll("[required]").forEach((inp) => {
      const bad = !inp.value.trim() || (inp.type === "email" && !isEmail(inp.value)) || (inp.type === "checkbox" && !inp.checked);
      inp.closest(".field")?.classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    const phone = el.elements.phone;
    if (phone?.value && !/^[+\d][\d\s-]{6,}$/.test(phone.value)) { phone.closest(".field").classList.add("invalid"); ok = false; }
    else phone?.closest(".field").classList.remove("invalid");
    if (!ok) {
      setNote({ cls: "err", text: "Please complete the highlighted fields." });
      el.querySelector(".invalid .input, .invalid input")?.focus();
      return;
    }
    const data = {};
    new FormData(el).forEach((v, k) => { if (k !== "website") data[k] = v; });
    if (company.formEndpoint) {
      try {
        const r = await fetch(company.formEndpoint, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ _subject: title, ...data }) });
        if (!r.ok) throw new Error(r.status);
        setNote({ cls: "ok", text: "Thank you! Your message has been sent. We will get back to you soon." });
        el.reset();
      } catch {
        setNote({ cls: "err", text: "Sorry, something went wrong. Please email " + company.email + " directly." });
      }
    } else {
      const body = Object.keys(data).map((k) => k[0].toUpperCase() + k.slice(1) + ": " + data[k]).join("\n");
      location.href = "mailto:" + company.email + "?subject=" + encodeURIComponent(title + (data.subject ? " – " + data.subject : "")) + "&body=" + encodeURIComponent(body);
      setNote({ cls: "ok", text: "Your email app is opening with your message ready to send to " + company.email + "." });
    }
  }

  return (
    <form ref={form} className="form" noValidate onSubmit={submit}>
      {children}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field full"><label className="consent" style={{ fontSize: 13 }}><input type="checkbox" name="consent" required /> I agree that {company.name} may use these details to reply to my enquiry. *</label><p className="err-msg">Please tick to continue.</p></div>
      <div className="full"><button className="btn btn-primary" type="submit">Send message <Icon name="arrow" /></button></div>
      <div className={"notice full " + (note.cls ? note.cls : "")} role="status" aria-live="polite">{note.text}</div>
    </form>
  );
}

// One labelled field with its error message
export function Field({ id, label, err, full, as = "input", options, ...p }) {
  const input = as === "select"
    ? <select id={id} className="input" {...p}><option value="">Select…</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
    : as === "textarea" ? <textarea id={id} className="input" {...p} /> : <input id={id} className="input" {...p} />;
  return <div className={"field" + (full ? " full" : "")}><label htmlFor={id}>{label}</label>{input}<p className="err-msg">{err}</p></div>;
}
