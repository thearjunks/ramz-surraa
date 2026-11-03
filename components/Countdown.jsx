"use client";
import { useEffect, useState } from "react";
import { status } from "@/lib/site";

export default function Countdown({ e }) {
  const [now, setNow] = useState(null); // null on the server → no hydration mismatch
  useEffect(() => {
    setNow(Date.now());
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  const d = new Date(e.start).getTime() - (now ?? 0);
  let body;
  if (now === null) body = null;
  else if (d <= 0) body = <div className="cd-done">{status(e, now) === "Ongoing" ? "Happening now — enjoy the show!" : "This event has taken place. Thank you to everyone who joined us."}</div>;
  else {
    const u = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
    body = ["Days", "Hours", "Minutes", "Seconds"].map((l, i) => <div className="cd" key={l}><b>{String(u[i]).padStart(2, "0")}</b><span>{l}</span></div>);
  }
  return <div className="countdown" aria-label={"Countdown to " + e.title}>{body}</div>;
}
