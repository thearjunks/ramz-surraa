"use client";
import { useState } from "react";
import Icon from "../Icon";

export default function CopyPath({ text }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn-sm btn-ghost" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}><Icon name={ok ? "check" : "copy"} />{ok ? "Copied" : "Copy link"}</button>;
}
