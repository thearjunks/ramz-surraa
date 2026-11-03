import CmsPage from "./CmsPage";
import { db } from "@/lib/db";

export default function CmsPageExtras({ slug, preview = false }) {
  const row = db.prepare("SELECT sections,draft_sections,status FROM cms_route_sections WHERE slug = ?").get(slug);
  if (!row || !preview && row.status !== "published") return null;
  let sections;
  try { sections = JSON.parse(preview && row.draft_sections || row.sections); } catch { return null; }
  return <CmsPage page={{ sections }} />;
}
