"use client";
import { useActionState } from "react";
import Icon from "./Icon";

/* Form driven by a server action and a list of plain field specs:
   { name, label, type, required, options, list, placeholder, autoComplete, full, defaultValue, hint, min, max }
   Values come back from the action on error so nothing the user typed is lost. */
export default function ActionForm({ action, fields, submit = "Submit", hidden = {}, datalists = {}, className = "form", children }) {
  const [state, run, pending] = useActionState(action, null);
  const val = (f) => state?.values?.[f.name] ?? f.defaultValue ?? "";
  return (
    <form action={run} className={className} key={state ? JSON.stringify(state.values || {}) + (state.error || state.ok || "") : "init"}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}
      {fields.map((f) => {
        const id = "f-" + f.name;
        const common = { id, name: f.name, required: f.required, autoComplete: f.autoComplete, placeholder: f.placeholder, defaultValue: val(f), disabled: f.disabled };
        if (f.type === "checkbox") return (
          <div key={f.name} className="field full"><label className="consent"><input type="checkbox" name={f.name} required={f.required} defaultChecked={!!f.defaultValue} /> <span dangerouslySetInnerHTML={{ __html: f.label }} /></label></div>
        );
        return (
          <div key={f.name} className={"field" + (f.full ? " full" : "")}>
            <label htmlFor={id}>{f.label}{f.required && " *"}</label>
            {f.type === "select" ? <select className="input" {...common}>{!f.noEmpty && <option value="">Select…</option>}{f.options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}</select>
              : f.type === "textarea" ? <textarea className="input" {...common} />
              : <input className="input" type={f.type || "text"} list={f.list} min={f.min} max={f.max} inputMode={f.inputMode} maxLength={f.maxLength} {...common} />}
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
