"use client";
import { useEffect, useState } from "react";
import { src } from "@/lib/site";

// Home banner: photo carousel (slow cross-fade + Ken Burns drift) under live stage effects —
// sweeping light beams, drifting haze and a crowd silhouette with twinkling phone lights.
// Slides come from data/site.js → hero.slides. Respects "reduce motion".
const DUR = 6500;

// deterministic crowd silhouette (same on server and client)
const CROWD = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const heads = [], arms = [], lights = [];
  for (let x = -10; x < 1460; x += 30 + rnd() * 22) {
    const r = 13 + rnd() * 6, y = 112 + rnd() * 16;
    heads.push([x, y, r]);
    if (rnd() < 0.3) {
      const side = rnd() < 0.5 ? -1 : 1, hx = x + side * (r + 4) + side * rnd() * 18, hy = 28 + rnd() * 40;
      arms.push([x + side * r * 0.9, y + r + 6, hx, hy]);
      if (rnd() < 0.55) lights.push([hx, hy - 6, rnd() * 4]);
    }
  }
  return { heads, arms, lights };
})();

export default function HeroStage({ slides = [] }) {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => setStill(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => {
    if (slides.length < 2 || still) return;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), DUR);
    return () => clearTimeout(t);
  }, [i, still, slides.length]);
  if (!slides.length) return null;

  return (
    <>
      <div className="hero-bg stage" aria-hidden="true">
        {slides.map((s, k) => (
          <div key={s.src} className={"stage-slide" + (k === i ? " on" : "")}
            style={{ backgroundImage: `url(${src(s.src)})`, backgroundPosition: s.pos || "center 30%", animationDelay: `${-k * 4}s` }} />
        ))}
      </div>

      <div className="stage-fx" aria-hidden="true">
        <div className="beams"><span /><span /><span /><span /><span /></div>
        <div className="haze" />
        <svg className="crowd" viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice">
          <g fill="#050705" stroke="#050705" strokeLinecap="round">
            {CROWD.arms.map(([x1, y1, x2, y2], k) => <g key={"a" + k}><line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="13" /><circle cx={x2} cy={y2} r="8" /></g>)}
            {CROWD.heads.map(([x, y, r], k) => <g key={"h" + k}><circle cx={x} cy={y} r={r} /><ellipse cx={x} cy={y + r + 16} rx={r * 1.9} ry={r * 1.3} /></g>)}
            <rect x="0" y="140" width="1440" height="20" />
          </g>
          {CROWD.lights.map(([x, y, d], k) => <rect key={"l" + k} className="phone" x={x - 4} y={y - 6} width="8" height="12" rx="2" style={{ animationDelay: d + "s" }} />)}
        </svg>
      </div>

      {slides.length > 1 && (
        <div className="stage-ui">
          <div className="wrap">
            <div className="stage-nav" role="group" aria-label="Banner photos">
              <i className="eq" aria-hidden="true"><b /><b /><b /><b /></i>
              <span className="stage-cap" aria-live="polite">{slides[i].caption}</span>
              <div className="stage-dots">
                {slides.map((s, k) => (
                  <button key={s.src} type="button" aria-label={`Show photo ${k + 1}: ${s.caption || ""}`} aria-current={k === i || undefined} onClick={() => setI(k)}>
                    <span key={k === i ? "run" + i : "idle"} className={k === i && !still ? "run" : k === i ? "full" : ""} style={{ animationDuration: DUR + "ms" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
