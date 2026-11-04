// Image library for the CMS: photos shipped with the site (public/images, public/uploads)
// plus everything uploaded in the CMS (data/media, served at /media/...).
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const IMG = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
export const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml" };

function walk(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".")) return [];
    if (e.isDirectory()) return walk(path.join(dir, e.name), prefix + e.name + "/");
    if (!IMG.test(e.name)) return [];
    const st = fs.statSync(path.join(dir, e.name));
    return [{ path: prefix + e.name, name: e.name, size: st.size, at: st.mtimeMs }];
  });
}

/** Every image the CMS can use. uploaded = can be deleted from the CMS. */
export function listMedia() {
  const up = walk(MEDIA_DIR, "media/").map((m) => ({ ...m, uploaded: true }));
  const legacy = walk(path.join(DATA_DIR, "uploads"), "media/").map((m) => ({ ...m, uploaded: true }));
  const pub = [...walk(path.join(process.cwd(), "public", "uploads"), "uploads/"), ...walk(path.join(process.cwd(), "public", "images"), "images/")]
    .filter((m) => !/surraa-logo|icon/i.test(m.name));
  return [...up, ...legacy].sort((a, b) => b.at - a.at).concat(pub);
}

export const safeName = (n) => String(n || "").replace(/^media\//, "").replace(/[^\w.-]/g, "");

/** Save an uploaded File. Returns "media/<name>". */
export async function saveUpload(file) {
  const ext = (String(file.name).split(".").pop() || "").toLowerCase();
  if (!TYPES[ext] || ext === "svg") throw new Error("Please upload a JPG, PNG, WebP, GIF or AVIF image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large — the limit is 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const magic = buf.subarray(0, 12).toString("hex");
  if (!/^(ffd8ff|89504e47|47494638|52494646)/.test(magic) && !buf.subarray(4, 12).toString().includes("ftyp")) throw new Error("That file is not a valid image.");
  const base = String(file.name).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  let name = `${base}.${ext}`, i = 2;
  while (fs.existsSync(path.join(MEDIA_DIR, name))) name = `${base}-${i++}.${ext}`;
  fs.writeFileSync(path.join(MEDIA_DIR, name), buf);
  return "media/" + name;
}
