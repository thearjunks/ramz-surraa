"use client";
import { useState } from "react";
import MediaField from "./MediaField";
import Link from "next/link";

const GROUPS = [
  ["company", "Company & contact"], ["membership", "Membership"],
];

export default function CmsSiteEditor({ initial, media = [], cms = false }) {
  const [data, setData] = useState(initial);
  const setGroup = (group, key, value) => setData((d) => ({ ...d, [group]: { ...d[group], [key]: value } }));
  return <div className="full">
    <input type="hidden" name="content" value={JSON.stringify(data)} />
    <section className="a-card" style={{ marginBottom: 18 }}><h2>Shared website content</h2><div className="btn-row"><Link className="btn btn-ghost" href="/cms/home/">Homepage banners and sections</Link><Link className="btn btn-ghost" href="/cms/routes/artists/">Artists</Link><Link className="btn btn-ghost" href="/cms/routes/gallery/">Gallery</Link></div></section>
    {GROUPS.map(([group, title]) => <details key={group} className="a-card" style={{ marginBottom: 14 }} open={group === "company"}><summary><h2 style={{ display: "inline" }}>{title}</h2></summary><div className="form a-form3" style={{ marginTop: 16 }}>
      {Object.entries(data[group] || {}).map(([key, value]) => Array.isArray(value)
        ? <label key={key} className="field full">{key}<textarea className="input" rows="3" value={value.join("\n")} onChange={(e) => setGroup(group, key, e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></label>
        : ["logo", "favicon", "ogImage"].includes(key) ? <MediaField key={key} label={key} value={String(value ?? "")} onChange={(next) => setGroup(group, key, next)} media={media} cms={cms} />
        : <label key={key} className="field">{key}<input className="input" value={String(value ?? "")} onChange={(e) => setGroup(group, key, e.target.value)} /></label>)}
    </div></details>)}

  </div>;
}
