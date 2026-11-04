"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const endpoint = "/api/analytics";
const id = (key) => {
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
};

export default function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const visitor_id = id("surraa_visitor");
    let session_id = sessionStorage.getItem("surraa_session");
    if (!session_id) { session_id = crypto.randomUUID(); sessionStorage.setItem("surraa_session", session_id); }
    const started = Date.now();
    const send = (event_type, extra = {}, beacon = false) => {
      const body = JSON.stringify({ visitor_id, session_id, event_type, path: pathname || "/", ...extra });
      if (beacon && navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      else fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    send("page_view");
    const click = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("javascript:")) return;
      send("link_click", { label: (link.innerText || link.getAttribute("aria-label") || "Link").trim().slice(0, 120), target: href.slice(0, 500) });
    };
    let finished = false;
    const leave = () => {
      if (finished) return;
      finished = true;
      send("engagement", { engagement_ms: Math.min(Date.now() - started, 30 * 60 * 1000) }, true);
    };
    document.addEventListener("click", click);
    window.addEventListener("pagehide", leave, { once: true });
    return () => { leave(); document.removeEventListener("click", click); window.removeEventListener("pagehide", leave); };
  }, [pathname]);
  return null;
}
