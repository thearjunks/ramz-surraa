"use client";
import { useEffect } from "react";

// Adds bottom padding on phones while the sticky "Join" bar is shown
export function StickyPad() {
  useEffect(() => { document.body.classList.add("has-sticky"); return () => document.body.classList.remove("has-sticky"); }, []);
  return null;
}
