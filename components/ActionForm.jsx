"use client";
import { useActionState, useState } from "react";
import Icon from "./Icon";

/* Form driven by a server action and a list of plain field specs:
   { name, label, type, required, options, list, placeholder, autoComplete, full, defaultValue, hint, min, max }
   Values come back from the action on error so nothing the user typed is lost. */
export default function ActionForm({ action, fields, submit = "Submit", hidden = {}, datalists = {}, className = "form", children }) {
  const [state, run, pending] = useActionState(action, null);
  const val = (f) => state?.values?.[f.name] ?? f.defaultValue ?? "";
  const [passCount, setPassCount] = useState(() => Number(fields.find((f) => f.name === "quantity")?.defaultValue) || 1);
  const fullName = String(state?.values?.name ?? fields.find((f) => f.name === "name")?.defaultValue ?? "").trim().split(/\s+/).filter(Boolean);
  const primaryHolder = { first: fullName[0] || "", last: fullName.slice(1).join(" ") };
  const copyNameToFirstPass = (e) => {
    const parts = e.currentTarget.value.trim().split(/\s+/).filter(Boolean);
    const form = e.currentTarget.form;
    const first = form?.elements.namedItem("holder_first_1");
    const last = form?.elements.namedItem("holder_last_1");
    if (first && !first.value) first.value = parts[0] || "";
    if (last && !last.value) last.value = parts.slice(1).join(" ");
  };
  return (
    <form action={run} className={className} key={state ? JSON.stringify(state.values || {}) + (state.error || state.ok || "") : "init"}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}
      {fields.map((f) => {
        if (f.type === "section") return <div key={f.name} className="form-section full"><span className="form-section-number">{f.step}</span><div><h3>{f.label}</h3>{f.hint && <p>{f.hint}</p>}</div></div>;
        if (f.type === "pass_holders") return <div key={f.name} className="pass-holder-fields full">
          <h3>Names on the passes</h3><p className="hint">Each pass will show the first and last name entered here.</p>
          {Array.from({ length: passCount }, (_, i) => <fieldset key={i} className="pass-holder-row"><legend>Pass {i + 1}</legend>
            <label className="field" htmlFor={`f-holder-first-${i}`}><span>First name *</span><input className="input" id={`f-holder-first-${i}`} name={`holder_first_${i + 1}`} required maxLength={80} autoComplete="off" defaultValue={state?.values?.[`holder_first_${i + 1}`] ?? f.holders?.[i]?.first ?? (i === 0 ? primaryHolder.first : "")} /></label>
            <label className="field" htmlFor={`f-holder-last-${i}`}><span>Last name *</span><input className="input" id={`f-holder-last-${i}`} name={`holder_last_${i + 1}`} required maxLength={80} autoComplete="off" defaultValue={state?.values?.[`holder_last_${i + 1}`] ?? f.holders?.[i]?.last ?? (i === 0 ? primaryHolder.last : "")} /></label>
          </fieldset>)}
        </div>;
        const id = "f-" + f.name;
        const common = { id, name: f.name, required: f.required, autoComplete: f.autoComplete, placeholder: f.placeholder, defaultValue: val(f), disabled: f.disabled };
        if (f.type === "checkbox") return (
          <div key={f.name} className="field full"><label className="consent"><input type="checkbox" name={f.name} required={f.required} defaultChecked={!!f.defaultValue} /> <span dangerouslySetInnerHTML={{ __html: f.label }} /></label></div>
        );
        return (
          <div key={f.name} className={"field" + (f.full ? " full" : "")}>
            <label htmlFor={id}>{f.label}{f.required && " *"}</label>
            {f.type === "select" ? <select className="input" {...common} onChange={f.name === "quantity" ? (e) => setPassCount(Number(e.target.value) || 1) : undefined}>{!f.noEmpty && <option value="">Select…</option>}{f.options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}</select>
              : f.type === "textarea" ? <textarea className="input" {...common} />
              : <input className="input" type={f.type || "text"} list={f.list} min={f.min} max={f.max} inputMode={f.inputMode} maxLength={f.maxLength} {...common} onBlur={f.name === "name" ? copyNameToFirstPass : undefined} onChange={f.name === "quantity" ? (e) => setPassCount(Math.max(1, Math.min(Number(e.target.value) || 1, Number(f.max) || 100))) : undefined} />}
            {f.hint && <p className="hint">{f.hint}</p>}
          </div>
        );
      })}
      {Object.entries(datalists).map(([id, opts]) => <datalist key={id} id={id}>{opts.map((o) => <option key={o} value={o} />)}</datalist>)}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {children}
      {state?.error && <div className="notice err full" role="alert">{state.error}</div>}
      {state?.ok && <div className="notice ok full" role="status">{state.ok}</div>}
      <div className="full"><button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>{pending ? "Please wait…" : submit} {!pending && <Icon name="arrow" />}</button></div>
    </form>
  );
}
