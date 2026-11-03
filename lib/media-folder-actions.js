"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, audit } from "./db";
import { requirePerm } from "./auth";

const base = (fd) => fd.get("cms") === "1" ? "/cms/media/" : "/admin/content/media/";

export async function moveMediaFolder(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const parentId = Number(fd.get("parent_id")) || null;
  const folders = db.prepare("SELECT id,parent_id FROM cms_media_folders").all();
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  if (!byId.has(id) || (parentId && !byId.has(parentId))) redirect(`${base(fd)}?error=folder`);
  const seen = new Set([id]);
  for (let ancestor = parentId; ancestor; ancestor = byId.get(ancestor)?.parent_id) {
    if (seen.has(ancestor)) redirect(`${base(fd)}?folder=${id}&error=cycle`);
    seen.add(ancestor);
  }
  try { db.prepare("UPDATE cms_media_folders SET parent_id=? WHERE id=?").run(parentId, id); }
  catch { redirect(`${base(fd)}?folder=${id}&error=duplicate`); }
  audit(user.id, "cms.media.folder.move", "cms_media_folder", id, { parentId });
  revalidatePath(base(fd));
  redirect(`${base(fd)}?folder=${id}&folder_saved=1`);
}

export async function deleteEmptyMediaFolder(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const folder = db.prepare("SELECT parent_id FROM cms_media_folders WHERE id=?").get(id);
  if (!folder) redirect(base(fd));
  if (db.prepare("SELECT 1 FROM cms_media WHERE folder_id=?").get(id) ||
    db.prepare("SELECT 1 FROM cms_media_folders WHERE parent_id=?").get(id))
    redirect(`${base(fd)}?folder=${id}&error=notempty`);
  db.prepare("DELETE FROM cms_media_folders WHERE id=?").run(id);
  audit(user.id, "cms.media.folder.delete", "cms_media_folder", id);
  revalidatePath(base(fd));
  redirect(`${base(fd)}?folder=${folder.parent_id || ""}&folder_saved=1`);
}

export async function updateMediaDetails(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const filename = String(fd.get("filename") || "").trim();
  const alt = String(fd.get("alt_text") || "").trim();
  const row = db.prepare("SELECT folder_id FROM cms_media WHERE id=?").get(id);
  if (!row) redirect(`${base(fd)}?error=missing`);
  if (!filename || filename.length > 200 || /[\\/\x00-\x1f]/.test(filename) || alt.length > 300)
    redirect(`${base(fd)}?folder=${row.folder_id || ""}&error=metadata`);
  db.prepare("UPDATE cms_media SET filename=?,alt_text=? WHERE id=?").run(filename, alt, id);
  audit(user.id, "cms.media.details", "cms_media", id);
  revalidatePath(base(fd));
  redirect(`${base(fd)}?folder=${row.folder_id || ""}&details_saved=1`);
}
