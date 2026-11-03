"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, now, audit } from "./db";
import { requirePerm } from "./auth";
import { validCmsHref } from "./cms";

const text = (fd, key) => String(fd.get(key) || "").trim();
const fieldTypes = new Set(["text", "richtext", "number", "boolean", "date", "email", "media", "relation"]);
const parse = (raw, fallback) => { try { return JSON.parse(raw) ?? fallback; } catch { return fallback; } };

export async function saveCmsCollection(_, fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id")) || 0;
  const name = text(fd, "name").slice(0, 100), slug = text(fd, "slug").toLowerCase();
  const fields = parse(text(fd, "fields"), null);
  if (!name || !/^[a-z][a-z0-9-]{1,59}$/.test(slug) || !Array.isArray(fields) || !fields.length || fields.length > 30 ||
    fields.some((f) => !f || !/^[a-z][a-z0-9_]{0,39}$/.test(f.key) || typeof f.label !== "string" || !f.label.trim() || f.label.length > 80 || !fieldTypes.has(f.type)) ||
    new Set(fields.map((f) => f.key)).size !== fields.length) return { error: "Enter a name, key and valid unique fields." };
  for (const field of fields) {
    if (field.type === "relation" && !db.prepare("SELECT 1 FROM cms_collection_types WHERE id=?").get(Number(field.collectionId)))
      return { error: `Choose the related collection for ${field.label}.` };
  }
  if (id) {
    const existing = db.prepare("SELECT fields FROM cms_collection_types WHERE id=?").get(id);
    if (!existing) return { error: "Collection not found." };
    const entries = db.prepare("SELECT data,published_data FROM cms_collection_entries WHERE type_id=?").all(id);
    for (const old of parse(existing.fields, [])) {
      const changed = fields.find((f) => f.key === old.key);
      if ((!changed || changed.type !== old.type || old.type === "relation" && Number(changed.collectionId) !== Number(old.collectionId)) &&
        entries.some((e) => [parse(e.data, {}), parse(e.published_data, {})].some((data) => data[old.key] !== undefined && data[old.key] !== "")))
        return { error: `${old.label} contains entry data. Keep its key and type, or clear the values before changing the model.` };
    }
  }
  const at = now();
  let typeId = id;
  try {
    if (id) db.prepare("UPDATE cms_collection_types SET name=?,slug=?,fields=?,updated_at=? WHERE id=?").run(name, slug, JSON.stringify(fields), at, id);
    else typeId = Number(db.prepare("INSERT INTO cms_collection_types (name,slug,fields,created_at,updated_at) VALUES (?,?,?,?,?)").run(name, slug, JSON.stringify(fields), at, at).lastInsertRowid);
  } catch (error) { if (String(error).includes("UNIQUE")) return { error: "That collection key is already used." }; throw error; }
  audit(user.id, id ? "cms.collection.update" : "cms.collection.create", "cms_collection", typeId);
  revalidatePath("/", "layout");
  redirect(`/cms/collections/${typeId}/?saved=1`);
}

export async function saveCmsEntry(_, fd) {
  const user = await requirePerm("content");
  const typeId = Number(fd.get("type_id")), id = Number(fd.get("id")) || 0;
  const type = db.prepare("SELECT * FROM cms_collection_types WHERE id=?").get(typeId);
  if (!type) return { error: "Collection not found." };
  const existing = id ? db.prepare("SELECT * FROM cms_collection_entries WHERE id=? AND type_id=?").get(id, typeId) : null;
  if (id && !existing) return { error: "Entry not found." };
  const intent = text(fd, "status");
  if (!["draft", "published"].includes(intent)) return { error: "Invalid status." };
  const fields = parse(type.fields, []), data = {};
  for (const field of fields) {
    const raw = text(fd, `field_${field.key}`);
    if (field.required && !raw && field.type !== "boolean") return { error: `${field.label} is required.` };
    if (raw.length > 10000) return { error: `${field.label} is too long.` };
    if (field.type === "number" && raw && !Number.isFinite(Number(raw))) return { error: `${field.label} must be a number.` };
    if (field.type === "email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { error: `${field.label} must be an email.` };
    if (field.type === "date" && raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: `${field.label} must be a date.` };
    if (field.type === "media" && raw && !validCmsHref(raw)) return { error: `${field.label} must be a valid media URL.` };
    if (field.type === "relation" && raw) {
      const linked = db.prepare("SELECT status FROM cms_collection_entries WHERE id=? AND type_id=?").get(Number(raw), Number(field.collectionId));
      if (!linked) return { error: `Choose an existing entry for ${field.label}.` };
      if (intent === "published" && linked.status !== "published") return { error: `Publish the related entry for ${field.label} first.` };
    }
    data[field.key] = field.type === "boolean" ? fd.get(`field_${field.key}`) === "on"
      : ["number", "relation"].includes(field.type) && raw ? Number(raw) : raw;
  }
  const at = now(), serialized = JSON.stringify(data), published = intent === "published" ? serialized : existing?.published_data || null;
  const status = published ? "published" : "draft";
  let entryId = id;
  if (id) db.prepare("UPDATE cms_collection_entries SET data=?,published_data=?,status=?,updated_at=? WHERE id=? AND type_id=?")
    .run(serialized, published, status, at, id, typeId);
  else entryId = Number(db.prepare("INSERT INTO cms_collection_entries (type_id,data,published_data,status,created_at,updated_at) VALUES (?,?,?,?,?,?)")
    .run(typeId, serialized, published, status, at, at).lastInsertRowid);
  audit(user.id, intent === "published" ? "cms.entry.publish" : "cms.entry.draft", "cms_entry", entryId);
  revalidatePath("/", "layout");
  redirect(`/cms/collections/${typeId}/?saved=1`);
}

function relationUsers(typeId, entryId) {
  const models = db.prepare("SELECT id,fields FROM cms_collection_types").all();
  for (const model of models) {
    const fields = parse(model.fields, []).filter((f) => f.type === "relation" && Number(f.collectionId) === typeId);
    if (!fields.length) continue;
    if (!entryId) return true;
    const entries = db.prepare("SELECT id,data,published_data FROM cms_collection_entries WHERE type_id=?").all(model.id);
    if (entries.some((e) => !(model.id === typeId && e.id === entryId) &&
      [parse(e.data, {}), parse(e.published_data, {})].some((data) => fields.some((f) => Number(data[f.key]) === entryId)))) return true;
  }
  return false;
}
export async function deleteCmsEntry(fd) {
  const user = await requirePerm("content");
  const typeId = Number(fd.get("type_id")), id = Number(fd.get("id"));
  if (relationUsers(typeId, id)) redirect(`/cms/collections/${typeId}/?error=related`);
  db.prepare("DELETE FROM cms_collection_entries WHERE id=? AND type_id=?").run(id, typeId);
  audit(user.id, "cms.entry.delete", "cms_entry", id);
  revalidatePath("/", "layout");
  redirect(`/cms/collections/${typeId}/?deleted=1`);
}
export async function unpublishCmsEntry(fd) {
  const user = await requirePerm("content");
  const typeId = Number(fd.get("type_id")), id = Number(fd.get("id"));
  if (relationUsers(typeId, id)) redirect(`/cms/collections/${typeId}/?error=related`);
  db.prepare("UPDATE cms_collection_entries SET status='draft',published_data=NULL,updated_at=? WHERE id=? AND type_id=?").run(now(), id, typeId);
  audit(user.id, "cms.entry.unpublish", "cms_entry", id);
  revalidatePath("/", "layout");
  redirect(`/cms/collections/${typeId}/?saved=1`);
}
export async function deleteEmptyCmsCollection(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  if (db.prepare("SELECT 1 FROM cms_collection_entries WHERE type_id=?").get(id)) redirect(`/cms/collections/${id}/?error=notempty`);
  if (relationUsers(id, 0)) redirect(`/cms/collections/${id}/?error=related`);
  const sections = db.prepare(`SELECT sections AS content FROM cms_pages
    UNION ALL SELECT json_extract(draft_content,'$.sections') FROM cms_pages WHERE draft_content IS NOT NULL
    UNION ALL SELECT sections FROM cms_route_sections
    UNION ALL SELECT draft_sections FROM cms_route_sections WHERE draft_sections IS NOT NULL`).all();
  const components = db.prepare("SELECT section AS content FROM cms_components UNION ALL SELECT published_section FROM cms_components WHERE published_section IS NOT NULL").all();
  if (sections.some((s) => parse(s.content, []).some((block) => block.type === "collection" && Number(block.collectionId) === id)) ||
    components.some((s) => { const block = parse(s.content, {}); return block.type === "collection" && Number(block.collectionId) === id; }))
    redirect(`/cms/collections/${id}/?error=inuse`);
  db.prepare("DELETE FROM cms_collection_types WHERE id=?").run(id);
  audit(user.id, "cms.collection.delete", "cms_collection", id);
  redirect("/cms/collections/?deleted=1");
}
