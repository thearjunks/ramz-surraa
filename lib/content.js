// Website content store for the CMS. Each section is saved as JSON in the settings table
// (key "content.<section>"). Anything never edited falls back to data/site.js and lib/content-defaults.js.
// Importing this module (server only) makes lib/site.js serve the live, edited content.
import { db, setting, setSetting } from "./db";
import base from "@/data/site";
import { PAGE_DEFAULTS } from "./content-defaults";
import { SECTIONS, section } from "./content-schema";

const COMPANY = ["name", "short", "location", "tagline", "email", "phone", "passesPhone", "website", "youtube", "tiktok", "instagram", "facebook", "formEndpoint"];
const MEMBER = ["whatsapp", "fee", "period", "welcome", "nationalities", "areas"];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));

function stored(key) {
  try { const v = setting("content." + key, ""); return v ? JSON.parse(v) : {}; } catch { return {}; }
}

// Built-in values for a section, in the same shape the CMS form uses
function defaults(key) {
  const P = PAGE_DEFAULTS;
  switch (key) {
    case "details": return { ...pick(base.company, COMPANY), ...pick(base.membership, MEMBER) };
    case "home": return { ...P.home, slides: base.hero?.slides || [] };
    case "artists": return { items: base.artists || [], ...pick(P.artistsPage, ["guestKicker", "guestTitle", "teamKicker", "teamTitle", "heroImage"]), pageTitle: P.artistsPage.title };
    case "gallery": return { title: P.galleryPage.title, heroImage: P.galleryPage.heroImage || "", items: base.gallery || [] };
    default: return { ...(P[key] || {}) };
  }
}

/** Current value of one section (built-in values + saved edits). */
export function sectionValue(key) {
  if (key === "events") return { items: eventImages() };
  return { ...defaults(key), ...stored(key) };
}
export const isEdited = (key) => !!setting("content." + key, "");

// Event posters & photos live on the events themselves (bookings database)
function eventImages() {
  return db.prepare("SELECT id, name, date, poster, gallery FROM events ORDER BY date DESC, id DESC").all()
    .map((e) => { let g = []; try { g = JSON.parse(e.gallery || "[]"); } catch {} return { id: String(e.id), name: `${e.name} · ${e.date}`, poster: e.poster || "", gallery: g }; });
}
export function editedAt(key) { return setting("content_at." + key, ""); }

function build() {
  const v = Object.fromEntries(SECTIONS.filter((s) => !s.db).map((s) => [s.key, sectionValue(s.key)]));
  const d = v.details, a = v.artists, g = v.gallery;
  return {
    ...base,
    company: { ...base.company, ...pick(d, COMPANY) },
    membership: { ...base.membership, ...pick(d, MEMBER) },
    hero: { ...base.hero, slides: v.home.slides },
    artists: a.items,
    gallery: g.items,
    seo: v.seo,
    pages: {
      home: v.home, about: v.about, eventsPage: v.eventsPage, branding: v.branding, membershipPage: v.membershipPage, contactPage: v.contactPage, privacy: v.privacy, terms: v.terms,
      artistsPage: { title: a.pageTitle, guestKicker: a.guestKicker, guestTitle: a.guestTitle, teamKicker: a.teamKicker, teamTitle: a.teamTitle, heroImage: a.heroImage },
      galleryPage: { title: g.title, heroImage: g.heroImage },
    },
  };
}

const G = globalThis;
/** The whole website content (cached until the next CMS save). */
export function getContent() {
  if (!G.__surraaContentCache) G.__surraaContentCache = build();
  return G.__surraaContentCache;
}
G.__surraaContent = getContent;

// ---------- saving ----------
const MAX = { text: 300, textarea: 6000, lines: 6000 };
const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
const safeImage = (v) => (/^(images|media|uploads)\/[\w./ -]+$/i.test(v) && !v.includes("..")) || /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : "";
const safeUrl = (v) => (!v || /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : "");

function clean(field, raw) {
  const t = field.type || "text";
  if (t === "list") {
    const arr = Array.isArray(raw) ? raw.slice(0, 200) : [];
    return arr.map((it) => Object.fromEntries(field.item.map((f) => [f.name, clean(f, it?.[f.name])]))).filter((it) => Object.values(it).some((x) => x));
  }
  if (t === "images") return (Array.isArray(raw) ? raw : []).map((x) => safeImage(String(x || "").trim())).filter(Boolean).slice(0, 100);
  if (t === "hidden") return String(raw ?? "").slice(0, 200);
  if (t === "lines") return String(Array.isArray(raw) ? raw.join("\n") : raw ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 300);
  let v = String(raw ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX[t] || MAX.text);
  if (t !== "textarea") v = v.replace(/\s*\n\s*/g, " ");
  if (t === "image") return safeImage(v);
  if (t === "url") return safeUrl(v);
  if (t === "select" && field.options && !field.options.some(([k]) => k === v)) return field.options[0][0];
  return v;
}

/** Validate + save one section. Returns the saved value. */
export function saveSection(key, data) {
  const s = section(key);
  if (!s) throw new Error("Unknown section");
  const out = {};
  for (const f of s.fields) if (f.name) out[f.name] = clean(f, data?.[f.name]);
  if (s.db && key === "events") { // write straight to the events table
    const up = db.prepare("UPDATE events SET poster = ?, gallery = ?, updated_at = ? WHERE id = ?");
    const now = new Date().toISOString();
    db.transaction(() => { for (const it of out.items) if (/^\d+$/.test(it.id)) up.run(it.poster, JSON.stringify(it.gallery), now, Number(it.id)); })();
    G.__surraaContentCache = null;
    return out;
  }
  if (key === "artists") { // every artist needs a unique short code for event line-ups
    const seen = new Set();
    out.items = out.items.filter((a) => a.name).map((a) => {
      let slug = slugify(a.slug || a.name) || "artist", n = slug, i = 2;
      while (seen.has(n)) n = `${slug}-${i++}`;
      seen.add(n); return { ...a, slug: n };
    });
  }
  setSetting("content." + key, JSON.stringify(out));
  setSetting("content_at." + key, new Date().toISOString());
  G.__surraaContentCache = null;
  return out;
}

export function resetSection(key) {
  db.prepare("DELETE FROM settings WHERE key IN (?, ?)").run("content." + key, "content_at." + key);
  G.__surraaContentCache = null;
}
