"use server";
import { db, setSetting, now, audit } from "./db";
import { eventEditorial } from "./event-editorial";
import { requirePerm } from "./auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveEventEditorial(_, fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id")), intent = String(fd.get("intent") || "");
  const event = eventEditorial(id);
  if (!event || !["draft","published"].includes(intent)) return { error: "Unknown event or save action." };
  const value = (key) => String(fd.get(`field_${key}`) || "").trim();
  const content = { name: value("name"), category: value("category"), description: value("description"), poster: value("poster") };
  if (!content.name || content.name.length > 200 || content.category.length > 100 || content.description.length > 10000 ||
    Object.values(content).some((v) => /[<>]/.test(v))) return { error: "Check the event name, category and description." };
  if (content.poster && content.poster !== event.live.poster && !db.prepare("SELECT 1 FROM cms_media WHERE url=? AND mime LIKE 'image/%'").get(content.poster)) return { error: "Choose an image from the media library." };
  if (String(fd.get("updated_at")) !== event.live.updated_at || String(fd.get("draft_at")) !== (event.draft?.at || "")) return { error: "Another editor has updated this event. Reload before saving your changes." };
  const at = now(), key = `cms_event_editorial_${id}`;
  db.transaction(() => {
    if (intent === "draft") setSetting(key, JSON.stringify({ content, at }));
    else {
      db.prepare("UPDATE events SET name=?,category=?,description=?,poster=?,updated_at=? WHERE id=?").run(content.name, content.category, content.description, content.poster, at, id);
      db.prepare("DELETE FROM settings WHERE key=?").run(key);
    }
    audit(user.id, `cms.event.${intent}`, "events", id);
  })();
  if (intent === "published") revalidatePath("/", "layout");
  redirect(`/cms/collections/events/${id}/?saved=${intent}`);
}
