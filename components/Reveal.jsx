"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Fades in every .reveal element as it scrolls into view — including ones React adds later (filters, tabs).
export default function Reveal() {
  const path = usePathname();
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
    let i = 0;
    const seen = new WeakSet(); // per-effect, so a re-run (dev StrictMode, route change) re-observes everything
    const scan = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el); el.style.transitionDelay = (i++ % 4) * 70 + "ms"; io.observe(el);
    });
    scan();
    // hero parallax (home page only has .hero-bg)
    const bg = document.querySelector(".hero-bg");
    const par = () => { const y = scrollY; if (bg && y < innerHeight * 1.2) bg.style.transform = `translate3d(0,${y * 0.25}px,0) scale(1.06)`; };
    addEventListener("scroll", par, { passive: true });
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); removeEventListener("scroll", par); };
  }, [path]);
  return null;
}
