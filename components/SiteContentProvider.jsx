"use client";
import { createContext, useContext } from "react";

const Context = createContext(null);
export function SiteContentProvider({ value, children }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useSiteContent() { return useContext(Context); }
