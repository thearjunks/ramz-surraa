"use client";
// CMS frame: grouped sidebar (drawer on mobile), top bar, bottom tab bar on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "../Icon";

const isOn = (path, h) => (h === "/cms/" ? path === "/cms/" || path === "/cms" : path.startsWith(h));

export default function Shell({ groups, me, tabs, account, top, brand = "Community CMS", children }) {
  const path = usePathname() || "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="cms-shell">
      <aside className={"cms-side" + (open ? " open" : "")} aria-label="CMS navigation">
        <Link href="/cms/" className="cms-brand"><img src="/images/surraa-logo.png" alt="" /><span>SURRAA<small>{brand}</small></span></Link>
        <nav className="cms-nav">
          {groups.map((g) => (
            <div key={g.label} style={{ display: "contents" }}>
              {g.label && <div className="grp">{g.label}</div>}
              {g.items.map((i) => (
                <Link key={i.h} href={i.h} aria-current={!i.ext && isOn(path, i.h) ? "page" : undefined} {...(i.ext ? { target: "_blank", rel: "noopener" } : {})}>
                  <Icon name={i.i} />{i.t}{i.ext && <span className="ext-ic"><Icon name="ext" /></span>}{i.count > 0 && <span className="count" aria-label={i.count + " waiting"}>{i.count}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="cms-me">
          <span className="av">{me.initials}</span>
          <div style={{ minWidth: 0 }}><b>{me.name}</b><small>{me.role}</small></div>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-top">
          <button className="icon-btn cms-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
          {top}
          <span className="spacer hide-sm" />
          {account}
        </header>
        <main className="cms-page" id="main">{children}</main>
      </div>
      <nav className="cms-tabbar" aria-label="Quick navigation">
        {tabs.map((t) => <Link key={t.h} href={t.h} aria-current={isOn(path, t.h) ? "page" : undefined}><Icon name={t.i} />{t.t}</Link>)}
      </nav>
    </div>
  );
}
