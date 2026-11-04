"use client";
// Hands the live company & membership details (edited in the CMS) to browser components
// such as the footer and forms, before they render.
export default function SiteData({ value, children }) {
  globalThis.__SURRAA_PUBLIC = value;
  return children;
}
