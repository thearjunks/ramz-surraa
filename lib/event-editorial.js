import { db, setting } from "./db";
export function eventEditorial(id) {
  const live = db.prepare("SELECT id,slug,name,category,description,poster,status,is_hidden,date,venue,updated_at FROM events WHERE id=?").get(Number(id));
  if (!live) return null;
  const raw = setting(`cms_event_editorial_${live.id}`);
  let draft;
  try { draft = raw ? JSON.parse(raw) : null; } catch { draft = null; }
  return { live, draft, values: draft?.content || live };
}
