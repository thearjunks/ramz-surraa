import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
const types = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", pdf: "application/pdf" };

export async function GET(_, { params }) {
  const name = (await params).name;
  if (!/^[a-zA-Z0-9_.-]{1,100}\.(?:jpe?g|png|webp|gif|avif|pdf)$/.test(name)) return new NextResponse(null, { status: 404 });
  const filename = [path.join(DATA_DIR, "media", name), path.join(DATA_DIR, "uploads", name)].find(fs.existsSync);
  try {
    if (!filename) throw new Error("Not found");
    const bytes = fs.readFileSync(filename);
    const extension = name.split(".").pop();
    return new NextResponse(bytes, { headers: { "Content-Type": types[extension], "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
