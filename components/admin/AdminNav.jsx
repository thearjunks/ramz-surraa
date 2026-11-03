"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "../Icon";

export default function AdminNav({ items }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="icon-btn admin-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "filter"} /></button>
      <nav className={"admin-nav" + (open ? " open" : "")} aria-label="Admin">
        {items.map(([t, h, i]) => {
          const on = h === "/admin/" ? path === "/admin/" || path === "/admin" : path.startsWith(h);
          return <Link key={h} href={h} aria-current={on ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={i} />{t}</Link>;
        })}
      </nav>
    </>
  );
}
