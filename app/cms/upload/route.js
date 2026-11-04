// POST an image from the CMS editor → saved to the media library. Returns { path }.
import { currentUser, can } from "@/lib/auth";
import { audit } from "@/lib/db";
import { saveUpload } from "@/lib/media";

export async function POST(req) {
  const u = await currentUser();
  if (!can(u, "content")) return Response.json({ error: "Please sign in again." }, { status: 403 });
  if (req.headers.get("origin") && new URL(req.headers.get("origin")).host !== req.headers.get("host")) return Response.json({ error: "Not allowed" }, { status: 403 });
  try {
    const fd = await req.formData();
    const out = [];
    for (const f of fd.getAll("file")) if (f && f.size) out.push(await saveUpload(f));
    if (!out.length) return Response.json({ error: "Choose an image first." }, { status: 400 });
    audit(u.id, "media.upload", "media", out.join(", "));
    return Response.json({ path: out[0], paths: out });
  } catch (e) {
    return Response.json({ error: e.message || "Upload failed." }, { status: 400 });
  }
}
