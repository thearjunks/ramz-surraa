import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
const types = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf" };

export async function GET(_, { params }) {
  const name = (await params).name;
  if (!/^[a-zA-Z0-9_-]{10,64}\.(?:jpg|png|webp|gif|pdf)$/.test(name)) return new NextResponse(null, { status: 404 });
  const filename = path.join(DATA_DIR, "uploads", name);
  try {
    const bytes = fs.readFileSync(filename);
    const extension = name.split(".").pop();
    return new NextResponse(bytes, { headers: { "Content-Type": types[extension], "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
