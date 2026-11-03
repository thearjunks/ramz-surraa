"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import ContactLink from "./ContactLink";
import { C } from "@/lib/site";
import { useSiteContent } from "./SiteContentProvider";

export default function Footer({ navigation, content }) {
  const company = useSiteContent()?.company || C;
  const [top, setTop] = useState(false);
  useEffect(() => {
    const f = () => setTop(window.scrollY > 700);
    f(); addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);
  const footerItem = ([label, href, children]) => <li key={`${href}-${label}`}><Link href={href}>{label}</Link>
    {!!children?.length && <ul className="foot-submenu">{children.map(footerItem)}</ul>}</li>;

  return (
    <>
      <footer className="site-footer">
        <div className="wrap">
          <div className="foot-grid foot-simple">
            <div>
              <img src={content?.logo || company.logo || "/images/surraa-logo.png"} alt="SURRAA" width="130" height="61" style={{ height: 52, width: "auto", marginBottom: 14 }} />
              <p className="muted" style={{ maxWidth: "36ch" }}>{content?.description || `${company.name}, ${company.location}. ${company.tagline}`}</p>
            </div>
            <div><h4>{content?.heading || "Explore"}</h4><ul>
              {(navigation || [["Upcoming Events", "/events/"], ["Membership", "/membership/"], ["Track Entry Pass", "/track-entry-pass/"], ["Gallery", "/gallery/"], ["Contact", "/contact/"]]).map(footerItem)}</ul></div>
            <div><h4>Contact</h4><ul>
              <li><ContactLink k="email" /></li><li><ContactLink k="phone" /></li>
              <li style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <ContactLink className="icon-btn" k="youtube" external aria-label="YouTube"><Icon name="yt" /></ContactLink>
                <ContactLink className="icon-btn" k="tiktok" external hideEmpty aria-label="TikTok"><Icon name="tiktok" /></ContactLink>
              </li></ul></div>
          </div>
          <div className="foot-bottom"><span>© {new Date().getFullYear()} {content?.copyright || `${company.name} · ${company.location}`}</span><span style={{ display: "flex", gap: 18 }}><Link href="/terms/">Terms</Link><Link href="/privacy/">Privacy</Link></span></div>
        </div>
      </footer>
      <button className={"icon-btn to-top" + (top ? " show" : "")} aria-label="Back to top" style={{ background: "var(--card2)" }}
        onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><Icon name="up" /></button>
    </>
  );
}
