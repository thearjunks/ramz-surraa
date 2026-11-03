"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import ContactLink from "./ContactLink";
import { C } from "@/lib/site";

export default function Footer() {
  const [top, setTop] = useState(false);
  useEffect(() => {
    const f = () => setTop(window.scrollY > 700);
    f(); addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);

  return (
    <>
      <footer className="site-footer">
        <div className="wrap">
          <div className="foot-grid foot-simple">
            <div>
              <img src="/images/surraa-logo.png" alt="SURRAA" width="130" height="61" style={{ height: 52, width: "auto", marginBottom: 14 }} />
              <p className="muted" style={{ maxWidth: "36ch" }}>{C.name}, {C.location}. {C.tagline}</p>
            </div>
            <div><h4>Explore</h4><ul>
              <li><Link href="/events/">Upcoming Events</Link></li><li><Link href="/membership/">Membership</Link></li>
              <li><Link href="/track-entry-pass/">Track Entry Pass</Link></li><li><Link href="/gallery/">Gallery</Link></li><li><Link href="/contact/">Contact</Link></li></ul></div>
            <div><h4>Contact</h4><ul>
              <li><ContactLink k="email" /></li><li><ContactLink k="phone" /></li>
              <li style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <ContactLink className="icon-btn" k="youtube" external aria-label="YouTube"><Icon name="yt" /></ContactLink>
                <ContactLink className="icon-btn" k="tiktok" external hideEmpty aria-label="TikTok"><Icon name="tiktok" /></ContactLink>
              </li></ul></div>
          </div>
          <div className="foot-bottom"><span>© {new Date().getFullYear()} {C.name} · {C.location}</span><span style={{ display: "flex", gap: 18 }}><Link href="/terms/">Terms</Link><Link href="/privacy/">Privacy</Link></span></div>
        </div>
      </footer>
      <button className={"icon-btn to-top" + (top ? " show" : "")} aria-label="Back to top" style={{ background: "var(--card2)" }}
        onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><Icon name="up" /></button>
    </>
  );
}
