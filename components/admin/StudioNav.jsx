"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "../Icon";

const sections = [
  ["Workspace", [["Overview", "/cms/", "star"]]],
  ["Content manager", [["Pages", "/cms/pages/", "screen"], ["Components", "/cms/components/", "sliders"], ["Collection types", "/cms/collections/", "cal"]]],
  ["Website", [["Site content", "/cms/site/", "screen"], ["Media library", "/cms/media/", "camera"], ["Navigation", "/cms/navigation/", "sliders"], ["Sitemap", "/cms/sitemap/", "search"]]],
];
export default function StudioNav() {
  const path = usePathname().replace(/\/?$/, "/");
  const [open, setOpen] = useState(false);
  const current = (href) => href === "/cms/" ? path === href : path.startsWith(href) ||
    href === "/cms/pages/" && (path.startsWith("/cms/routes/") || path === "/cms/home/");
  return <><button type="button" className="icon-btn admin-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="studio-navigation"><Icon name="filter" /> Menu</button>
    <nav id="studio-navigation" className={"admin-nav studio-nav" + (open ? " open" : "")} aria-label="Content studio">
      {sections.map(([label, links]) => <div key={label} className="studio-nav-group"><p>{label}</p>
        {links.map(([name, href, icon]) => <div key={href}><Link href={href} aria-current={current(href) ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={icon} />{name}</Link>
          {href === "/cms/site/" && current(href) && <div className="studio-subnav">{["header", "footer"].map((kind) => <Link key={kind} href={href + kind + "/"} onClick={() => setOpen(false)}>{kind === "header" ? "Website header" : "Website footer"}</Link>)}</div>}
        </div>)}
      </div>)}
    </nav></>;
}
