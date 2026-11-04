import { NextResponse } from "next/server";
import { db, now } from "@/lib/db";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f-]{20,64}$/i;
const allowed = new Set(["page_view", "link_click", "engagement"]);
const geoCache = globalThis.__surraaGeoCache || (globalThis.__surraaGeoCache = new Map());
const rate = globalThis.__surraaAnalyticsRate || (globalThis.__surraaAnalyticsRate = new Map());
const KUWAIT = { AH: "Al Ahmadi", FA: "Al Farwaniya", HA: "Hawalli", JA: "Al Jahra", KU: "Al Asimah", MU: "Mubarak Al Kabeer" };
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function ipOf(request) { return request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim(); }
function governorate(value = "") {
  const v = value.toLowerCase();
  if (v.includes("ahmadi")) return "Al Ahmadi";
  if (v.includes("farwani")) return "Al Farwaniya";
  if (v.includes("hawalli") || v.includes("hawally")) return "Hawalli";
  if (v.includes("jahra")) return "Al Jahra";
  if (v.includes("mubarak")) return "Mubarak Al Kabeer";
  if (v.includes("capital") || v.includes("asimah") || v.includes("kuwait city")) return "Al Asimah";
  return KUWAIT[value.toUpperCase()] || value || "Unknown";
}
async function locate(request) {
  const countryHeader = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || request.headers.get("x-country-code");
  const regionHeader = request.headers.get("x-vercel-ip-country-region") || request.headers.get("x-region");
  if (countryHeader) {
    const code = countryHeader.toUpperCase();
    return { country: code === "KW" ? "Kuwait" : (code.length === 2 ? countryNames.of(code) : countryHeader), region: code === "KW" ? governorate(regionHeader) : (regionHeader || "Unknown") };
  }
  const ip = ipOf(request);
  if (!ip || ip === "local" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) return { country: "Unknown", region: "Unknown" };
  const cached = geoCache.get(ip);
  if (cached && cached.until > Date.now()) return cached.value;
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    const data = await response.json();
    const value = data.success ? { country: data.country || "Unknown", region: data.country === "Kuwait" ? governorate(data.region) : (data.region || "Unknown") } : { country: "Unknown", region: "Unknown" };
    geoCache.set(ip, { value, until: Date.now() + 6 * 3600e3 });
    return value;
  } catch { return { country: "Unknown", region: "Unknown" }; }
}

export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return new NextResponse(null, { status: 413 });
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) return new NextResponse(null, { status: 403 });
    if (/bot|crawler|spider|preview/i.test(request.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 });
    const ip = ipOf(request) || "unknown";
    const current = rate.get(ip);
    if (!current || current.until < Date.now()) rate.set(ip, { count: 1, until: Date.now() + 60000 });
    else if (++current.count > 120) return new NextResponse(null, { status: 429 });
    const body = await request.json();
    if (!uuid.test(body.visitor_id || "") || !uuid.test(body.session_id || "") || !allowed.has(body.event_type) || !String(body.path || "").startsWith("/")) return new NextResponse(null, { status: 400 });
    let geo = db.prepare("SELECT country, region FROM analytics_events WHERE session_id = ? AND event_type = 'page_view' ORDER BY id DESC LIMIT 1").get(body.session_id);
    if (!geo) geo = await locate(request);
    db.prepare(`INSERT INTO analytics_events (visitor_id, session_id, event_type, path, label, target, country, region, engagement_ms, at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(body.visitor_id, body.session_id, body.event_type, String(body.path).slice(0, 500), String(body.label || "").slice(0, 120), String(body.target || "").slice(0, 500), geo.country, geo.region, Math.max(0, Math.min(Number(body.engagement_ms) || 0, 1800000)), now());
    return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch { return new NextResponse(null, { status: 400 }); }
}
