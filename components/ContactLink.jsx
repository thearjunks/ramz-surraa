"use client";
import Icon from "./Icon";
import { C, tel } from "@/lib/site";
import { useSiteContent } from "./SiteContentProvider";

// Replaces the old data-c="..." links: builds the href (and default text) from company details in data/site.js.
// Renders nothing when the value is empty and hideEmpty is set.
export default function ContactLink({ k, icon, hideEmpty, external, children, ...rest }) {
  const v = (useSiteContent()?.company || C)[k];
  if (!v && hideEmpty) return null;
  const href = !v ? undefined : k === "email" ? "mailto:" + v : /phone/i.test(k) ? tel(v) : k === "whatsapp" ? "https://wa.me/" + v : v;
  const ext = external ? { target: "_blank", rel: "noopener" } : {};
  return (
    <a href={href} {...ext} {...rest}>
      {icon && <Icon name={icon} />}
      {children ?? (k === "email" || /phone/i.test(k) ? v : null)}
    </a>
  );
}
