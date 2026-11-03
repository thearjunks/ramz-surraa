import CmsPage from "./CmsPage";
import { db } from "@/lib/db";

export default function CmsPageExtras({ slug }) {
  const row = db.prepare("SELECT sections FROM cms_route_sections WHERE slug = ? AND status = 'published'").get(slug);
  if (!row) return null;
  let sections;
  try { sections = JSON.parse(row.sections); } catch { return null; }
  return <CmsPage page={{ sections }} />;
}
