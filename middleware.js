import { NextResponse } from "next/server";

export function middleware(request) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "cms.surraa.com" && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/content/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
