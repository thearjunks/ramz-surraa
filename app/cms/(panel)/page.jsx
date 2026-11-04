import Link from "next/link";
import Icon from "@/components/Icon";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { SECTIONS, GROUPS } from "@/lib/content-schema";
import { getContent, isEdited, editedAt } from "@/lib/content";
import { listMedia } from "@/lib/media";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const LABEL = { "content.update": "Saved", "content.reset": "Restored original", "media.upload": "Uploaded", "media.delete": "Deleted image" };
const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Overview() {
  const u = await currentUser();
  if (!u) return null; // the layout sends signed-out visitors to the login page
  const c = getContent();
  const media = listMedia();
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const recent = db.prepare(`SELECT a.*, u.name who FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.action LIKE 'content.%' OR a.action LIKE 'media.%' ORDER BY a.id DESC LIMIT 8`).all();
  const stats = [
    ["Banner photos", c.hero?.slides?.length || 0, "/cms/edit/home/", "star"],
    ["Artists", c.artists?.length || 0, "/cms/edit/artists/", "mic"],
    ["Gallery photos", c.gallery?.length || 0, "/cms/edit/gallery/", "image"],
    ["Images in library", media.length, "/cms/images/", "camera"],
  ];
  return (
    <>
      <div className="cms-head">
        <div><h1>{hello}, {u.name.split(" ")[0]}</h1><p>Choose what you want to change on the website. Changes go live as soon as you save.</p></div>
        <div className="row"><a className="btn" href="/" target="_blank" rel="noopener"><Icon name="globe" />View website</a><Link className="btn btn-primary" href="/cms/images/"><Icon name="camera" />All website images</Link></div>
      </div>

      <div className="k-grid k-g4" style={{ marginBottom: 24 }}>
        {stats.map(([l, n, href, i]) => <Link key={l} className="kpi" href={href}><small><Icon name={i} /> {l}</small><b>{n}</b></Link>)}
      </div>

      <div className="cols">
        <div className="k-stack">
          {GROUPS.map((g) => (
            <section key={g} className="k-card">
              <div className="card-h"><h2>{g === "Pages" ? "Website pages" : g === "Content" ? "Artists & photos" : "Settings"}</h2></div>
              <div className="sec-list">
                {SECTIONS.filter((s) => s.group === g).map((s) => {
                  const ed = isEdited(s.key);
                  return (
                    <Link key={s.key} className="sec" href={`/cms/edit/${s.key}/`}>
                      <span className="ic"><Icon name={s.icon} /></span>
                      <span className="tx"><b>{s.title}</b><small>{s.desc}</small></span>
                      <span className={"pill " + (ed || s.db ? "up" : "past")}>{s.db ? "Live" : ed ? "Edited " + when(editedAt(s.key)).split(",")[0] : "Original"}</span>
                      <span className="go"><Icon name="right" /></span>
                    </Link>
                  );
                })}
                {g === "Content" && <>
                  <Link className="sec" href="/cms/images/"><span className="ic"><Icon name="camera" /></span><span className="tx"><b>All website images</b><small>See every photo on the site, page by page, and change any of them.</small></span><span className="pill up">Start here</span><span className="go"><Icon name="right" /></span></Link>
                  <Link className="sec" href="/cms/media/"><span className="ic"><Icon name="upload" /></span><span className="tx"><b>Image library</b><small>Upload photos once, then use them anywhere.</small></span><span className="pill">{media.length} images</span><span className="go"><Icon name="right" /></span></Link>
                  <a className="sec" href="/admin/events/"><span className="ic"><Icon name="cal" /></span><span className="tx"><b>Event dates & line-up</b><small>Dates, venue, tickets and line-up — managed in the bookings admin.</small></span><span className="pill">Admin</span><span className="go"><Icon name="ext" /></span></a>
                </>}
              </div>
            </section>
          ))}
        </div>
        <div className="k-stack">
          <section className="k-card">
            <div className="card-h"><h2><Icon name="globe" />Live website</h2></div>
            <div className="site-peek">
              {c.hero?.slides?.[0]?.src && <img src={"/" + c.hero.slides[0].src} alt="" />}
              <div><b>{c.company?.name}</b><small>{c.company?.tagline}</small></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              {[["Home", "/"], ["About", "/about/"], ["Artists", "/artists/"], ["Gallery", "/gallery/"], ["Membership", "/membership/"], ["Contact", "/contact/"]].map(([t, h]) => <a key={h} className="btn btn-sm" href={h} target="_blank" rel="noopener">{t}</a>)}
            </div>
          </section>
          <section className="k-card">
            <div className="card-h"><h2><Icon name="activity" />Recent changes</h2></div>
            {recent.length ? <ul className="recent">{recent.map((r) => (
              <li key={r.id}><b>{LABEL[r.action] || r.action}</b> {r.action.startsWith("content") ? (SECTIONS.find((s) => s.key === r.entity_id)?.title || r.entity_id) : String(r.entity_id).replace(/media\//g, "")}<small>{r.who || "—"} · {when(r.at)}</small></li>
            ))}</ul> : <p className="muted small">No changes yet. Pick a page on the left to start editing.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
