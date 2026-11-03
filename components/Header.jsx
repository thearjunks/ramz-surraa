"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { signOut } from "@/lib/actions";

const NAV = [["Home", "/"], ["About", "/about/"], ["Events", "/events/"], ["Past Events", "/events/past/"], ["Gallery", "/gallery/"], ["Membership", "/membership/"], ["Contact", "/contact/"]];

// Floating glass "capsule" header. A soft spotlight glides under the link you point at
// and settles back on the current page; the current page shows a tiny live equalizer.
export default function Header({ user, navigation = NAV, logo = "/images/surraa-logo.png" }) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState({ x: 0, w: 0, on: false });
  const header = useRef(null);
  const menu = useRef(null);

  const cur = (u) => (u === "/" ? path === "/" : path.startsWith(u) && !(u === "/events/" && path.startsWith("/events/past"))) ? "page" : undefined;

  const moveTo = useCallback((el) => {
    if (!el || !menu.current) return setSpot((s) => ({ ...s, on: false }));
    const m = menu.current.getBoundingClientRect(), r = el.getBoundingClientRect();
    setSpot({ x: r.left - m.left, w: r.width, on: true });
  }, []);
  const home = useCallback(() => moveTo(menu.current?.querySelector('a[aria-current="page"]')), [moveTo]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    const setHH = () => { header.current && document.documentElement.style.setProperty("--hh", header.current.offsetHeight + "px"); home(); };
    onScroll(); setHH();
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", setHH);
    document.fonts?.ready.then(home);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", setHH); };
  }, [home]);
  useLayoutEffect(() => { setOpen(false); home(); }, [path, home]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  const acct = user ? (user.staff ? (user.contentOnly ? ["/cms/", "CMS"] : ["/admin/", "Admin"]) : ["/account/", "My membership"]) : ["/sign-in/", "Member sign in"];

  return (
    <header ref={header} className={"site-header hdr3" + (scrolled ? " scrolled" : "")}>
      <div className="wrap">
        <div className="nav nav-capsule">
          <Link className="brand brand3" href="/" aria-label="SURRAA Community Association home">
            <img src={logo} alt="" width="86" height="40" />
            <span className="brand3-tag">Community<br />Association</span>
          </Link>

          <nav aria-label="Main">
            <ul ref={menu} className={"menu" + (open ? " open" : "")} id="menu" onMouseLeave={home}>
              <li className="spot" aria-hidden="true" style={{ transform: `translateX(${spot.x}px)`, width: spot.w, opacity: spot.on ? 1 : 0 }} />
              {navigation.map(([t, u]) => (
                <li key={u}>
                  <Link href={u} aria-current={cur(u)} onMouseEnter={(e) => moveTo(e.currentTarget)} onFocus={(e) => moveTo(e.currentTarget)}>
                    {cur(u) && <i className="eq" aria-hidden="true"><b /><b /><b /></i>}{t}
                  </Link>
                </li>
              ))}
              <li className="menu-mobile-only"><Link href="/account/passes/">My Entry Passes</Link></li>
              <li className="menu-mobile-only"><Link href="/track-entry-pass/">Track Entry Pass</Link></li>
              <li className="menu-mobile-only"><Link href={acct[0]}>{user && !user.staff ? user.name : acct[1]}</Link></li>
              {user && <li className="menu-mobile-only"><form action={signOut}><button type="submit" className="site-signout">Sign out</button></form></li>}
            </ul>
          </nav>

          <div className="nav-cta">
            <Link className="nav-chip nav-passes" href="/account/passes/"><Icon name="ticket" /><span>My Passes</span></Link>
            {user && !user.staff ? <details className="member-menu"><summary aria-label={`${user.name}, account menu`}><Icon name="users" /><span>{user.name}</span></summary><div className="member-menu-panel"><Link href="/account/">My membership</Link><Link href="/account/passes/">My passes</Link><form action={signOut}><button type="submit">Sign out</button></form></div></details>
              : <Link className="nav-chip nav-acct" href={acct[0]} title={acct[1]} aria-label={acct[1]}><Icon name="users" /><span>{user ? "Admin" : "Member sign in"}</span></Link>}
            {(!user || user.staff) && <Link className="btn-member" href="/membership/">
              <span className="bm-inner"><Icon name="star" /><span className="bm-txt">Get <em>Membership</em></span></span>
            </Link>}
            <button className="icon-btn burger" aria-label="Menu" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
              <Icon name={open ? "close" : "filter"} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
