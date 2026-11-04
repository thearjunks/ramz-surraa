"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, now, audit, DATA_DIR } from "./db";
import { requirePerm, currentUser, can, endSession } from "./auth";
import { validCmsSlug, validCmsHref, editablePage } from "./cms";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { setting, setSetting } from "./db";
import { sectionCatalog } from "./section-catalog";
import { SITE_ROUTES } from "./cms";
import { saveSection, resetSection } from "./content";
import { section } from "./content-schema";
import { MEDIA_DIR, safeName } from "./media";

const text = (fd, key) => String(fd.get(key) || "").trim();
const cmsPath = (fd, path = "") => fd.get("cms") === "1" ? `/cms/${path}` : `/admin/content/${path}`;
const types = new Set(["hero", "text", "image", "cta", "artists", "gallery", "events", "component", "collection", "shared-section"]);
export async function saveCmsRoute(_, fd) {
  const user = await requirePerm("content");
  const slug = text(fd, "slug");
  const status = text(fd, "status");
  if (!SITE_ROUTES.some((route) => route[2] === slug) || !["draft", "published"].includes(status))
    return { error: "Invalid page or status." };
  let sections;
  try { sections = JSON.parse(text(fd, "sections")); } catch { return { error: "Invalid page sections." }; }
  if (!Array.isArray(sections) || sections.length > 40 || sections.some((section) =>
    !section || !types.has(section.type) || (section.type === "shared-section" && !sectionCatalog().some((source) => source.value === section.source)) ||
    [section.heading, section.body, section.image, section.buttonLabel, section.buttonHref].some((value) =>
      value !== undefined && (typeof value !== "string" || value.length > 10000)) ||
    (section.image && !validCmsHref(section.image)) || (section.buttonHref && !validCmsHref(section.buttonHref)) ||
    (section.type === "component" && !db.prepare("SELECT 1 FROM cms_components WHERE id=?").get(Number(section.componentId))) ||
    (section.type === "collection" && !db.prepare("SELECT 1 FROM cms_collection_types WHERE id=?").get(Number(section.collectionId)))
  )) return { error: "Check the page sections and links." };
  const old = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(slug);
  const at = now();
  db.transaction(() => {
    if (old) db.prepare("INSERT INTO cms_route_revisions (slug, sections, status, by_user, created_at) VALUES (?,?,?,?,?)")
      .run(slug, old.sections, old.status, user.id, at);
    if (old?.draft_sections && old.draft_sections !== old.sections) db.prepare("INSERT INTO cms_route_revisions (slug,sections,status,by_user,created_at) VALUES (?,?,'draft',?,?)")
      .run(slug, old.draft_sections, user.id, at);
    db.prepare(`INSERT INTO cms_route_sections (slug, sections, status, updated_at) VALUES (?,?,?,?)
      ON CONFLICT(slug) DO UPDATE SET
      draft_sections=CASE WHEN excluded.status='draft' AND cms_route_sections.status='published' THEN excluded.sections END,
      sections=CASE WHEN excluded.status='draft' AND cms_route_sections.status='published' THEN cms_route_sections.sections ELSE excluded.sections END,
      status=CASE WHEN excluded.status='published' THEN 'published' ELSE cms_route_sections.status END,
      updated_at=excluded.updated_at`)
      .run(slug, JSON.stringify(sections), status, at);
    audit(user.id, "cms.route.save", "cms_route", slug, { status });
  })();
  const route = SITE_ROUTES.find((item) => item[2] === slug)[1];
  revalidatePath(route);
  redirect(fd.get("blocks") === "1" ? `/cms/routes/${slug}/blocks/?saved=1` : `/cms/routes/${slug}/?saved=1`);
}

export async function unpublishCmsBlocks(fd) {
  const user = await requirePerm("content");
  const slug = text(fd, "slug");
  const route = SITE_ROUTES.find((r) => r[2] === slug);
  if (!route) throw new Error("Unknown page");
  db.transaction(() => {
    const old = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(slug);
    if (old?.status !== "published") return;
    db.prepare("INSERT INTO cms_route_revisions (slug,sections,status,by_user,created_at) VALUES (?,?,?,?,?)")
      .run(slug, old.sections, old.status, user.id, now());
    db.prepare("UPDATE cms_route_sections SET sections=COALESCE(draft_sections,sections),draft_sections=NULL,status='draft',updated_at=? WHERE slug=?").run(now(), slug);
    audit(user.id, "cms.route.unpublish", "cms_route", slug);
  })();
  revalidatePath(route[1]);
  redirect(`/cms/routes/${slug}/blocks/?unpublished=1`);
}

export async function restoreCmsBlocks(fd) {
  const user = await requirePerm("content");
  const revision = db.prepare("SELECT slug,sections FROM cms_route_revisions WHERE id=?").get(Number(fd.get("id")));
  if (!revision) throw new Error("Revision not found");
  const current = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(revision.slug);
  if (!current) throw new Error("Page blocks not found");
  db.transaction(() => {
    db.prepare("INSERT INTO cms_route_revisions (slug,sections,status,by_user,created_at) VALUES (?,?,?,?,?)")
      .run(current.slug, current.draft_sections ?? current.sections, current.draft_sections ? "draft" : current.status, user.id, now());
    db.prepare(`UPDATE cms_route_sections SET
      draft_sections=CASE WHEN status='published' THEN ? END,
      sections=CASE WHEN status='published' THEN sections ELSE ? END,
      updated_at=? WHERE slug=?`).run(revision.sections, revision.sections, now(), current.slug);
    audit(user.id, "cms.route.restore.draft", "cms_route", current.slug);
  })();
  revalidatePath(`/cms/routes/${current.slug}/blocks/`);
  redirect(`/cms/routes/${current.slug}/blocks/?saved=1`);
}

export async function saveCmsComponent(_, fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id")) || 0;
  const name = text(fd, "name").slice(0, 100);
  const status = text(fd, "status");
  let sections;
  try { sections = JSON.parse(text(fd, "sections")); } catch { return { error: "Invalid component." }; }
  const section = sections?.[0];
  if (!name || !["draft", "published"].includes(status) || sections.length !== 1 || !section || !types.has(section.type) || (section.type === "shared-section" && !sectionCatalog().some((source) => source.value === section.source)) || section.type === "component" ||
    [section.heading, section.body, section.image, section.buttonLabel, section.buttonHref].some((value) =>
      value !== undefined && (typeof value !== "string" || value.length > 10000)) ||
    (section.image && !validCmsHref(section.image)) || (section.buttonHref && !validCmsHref(section.buttonHref)) ||
    (section.type === "collection" && !db.prepare("SELECT 1 FROM cms_collection_types WHERE id=?").get(Number(section.collectionId))))
    return { error: "Enter a name and one valid section." };
  const at = now();
  try {
    if (id) db.prepare("UPDATE cms_components SET name=?,section=?,published_section=CASE WHEN ?='published' THEN ? ELSE published_section END,status=CASE WHEN ?='published' THEN 'published' ELSE status END,updated_at=? WHERE id=?")
      .run(name, JSON.stringify(section), status, JSON.stringify(section), status, at, id);
    else db.prepare("INSERT INTO cms_components (name,section,published_section,status,created_at,updated_at) VALUES (?,?,?,?,?,?)")
      .run(name, JSON.stringify(section), status === "published" ? JSON.stringify(section) : null, status, at, at);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return { error: "A component already has that name." };
    throw error;
  }
  audit(user.id, id ? "cms.component.update" : "cms.component.create", "cms_component", id || name);
  revalidatePath("/", "layout");
  revalidatePath("/cms/components/");
  redirect("/cms/components/?saved=1");
}

export async function deleteCmsComponent(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const component = db.prepare("SELECT id FROM cms_components WHERE id=?").get(id);
  if (!component) redirect("/cms/components/?error=missing");
  const inUse = db.prepare(`SELECT sections FROM cms_pages
    UNION ALL SELECT json_extract(draft_content,'$.sections') FROM cms_pages WHERE draft_content IS NOT NULL
    UNION ALL SELECT sections FROM cms_route_sections
    UNION ALL SELECT draft_sections FROM cms_route_sections WHERE draft_sections IS NOT NULL`).all()
    .some((row) => { try { return JSON.parse(row.sections).some((s) => s.type === "component" && Number(s.componentId) === id); } catch { return true; } });
  if (inUse) redirect("/cms/components/?error=inuse");
  db.prepare("DELETE FROM cms_components WHERE id=?").run(id);
  audit(user.id, "cms.component.delete", "cms_component", id);
  revalidatePath("/", "layout");
  redirect("/cms/components/?deleted=1");
}

export async function unpublishCmsComponent(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  db.prepare("UPDATE cms_components SET status='draft',updated_at=? WHERE id=?").run(now(), id);
  audit(user.id, "cms.component.unpublish", "cms_component", id);
  revalidatePath("/", "layout");
  redirect(`/cms/components/${id}/?unpublished=1`);
}

export async function saveCmsPage(_, fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id")) || 0;
  const slug = text(fd, "slug").toLowerCase();
  const title = text(fd, "title");
  const description = text(fd, "description");
  const keywords = text(fd, "keywords");
  const canonical = text(fd, "canonical_url");
  const ogImage = text(fd, "og_image");
  const status = text(fd, "status");
  let sections;
  try { sections = JSON.parse(text(fd, "sections")); } catch { return { error: "Invalid page sections." }; }
  if (!validCmsSlug(slug) || !title || !["draft", "published"].includes(status) || !Array.isArray(sections))
    return { error: "Enter a valid page title, URL and status." };
  if (description.length > 500 || keywords.length > 500 ||
    (canonical && !validCmsHref(canonical)) || (ogImage && !validCmsHref(ogImage)))
    return { error: "Check the SEO fields and links." };
  if (sections.length > 40 || sections.some((s) => !s || !types.has(s.type) || (s.type === "shared-section" && !sectionCatalog().some((source) => source.value === s.source)) ||
    (s.type === "component" && (!Number.isInteger(Number(s.componentId)) || !db.prepare("SELECT 1 FROM cms_components WHERE id = ?").get(Number(s.componentId)))) ||
    (s.type === "collection" && !db.prepare("SELECT 1 FROM cms_collection_types WHERE id = ?").get(Number(s.collectionId))) ||
    [s.heading, s.body, s.image, s.buttonLabel, s.buttonHref].some((x) => typeof x !== "undefined" && (typeof x !== "string" || x.length > 10000)) ||
    (s.buttonHref && !validCmsHref(s.buttonHref)) || (s.image && !validCmsHref(s.image))))
    return { error: "A section contains unsupported content or a link." };
  const t = now();
  const proposed = { slug, title, description, keywords, canonical_url: canonical, og_image: ogImage, sections };
  let pageId = id;
  try {
    db.transaction(() => {
      if (id) {
        const old = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
        if (!old) throw new Error("Page not found");
        db.prepare("INSERT INTO cms_revisions (page_id, snapshot, by_user, created_at) VALUES (?,?,?,?)")
          .run(id, JSON.stringify(old), user.id, t);
        if (status === "draft" && old.status === "published") {
          db.prepare("UPDATE cms_pages SET draft_content=?,updated_at=? WHERE id=?").run(JSON.stringify(proposed), t, id);
        } else {
          writePageVersion(id, proposed, status, t);
        }
        revalidatePath("/" + old.slug + "/");
      } else {
        pageId = Number(db.prepare("INSERT INTO cms_pages (slug,title,description,keywords,canonical_url,og_image,status,sections,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .run(slug, title, description, keywords, canonical, ogImage, status, JSON.stringify(sections), t, t).lastInsertRowid);
      }
      audit(user.id, id ? "cms.page.update" : "cms.page.create", "cms_page", pageId, { slug, status });
    })();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return { error: "That page URL is already used." };
    throw e;
  }
  revalidatePath("/" + slug + "/");
  revalidatePath("/admin/content/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? `pages/${pageId}/?saved=1` : `${pageId}/?saved=1`));
}

function writePageVersion(id, candidate, status, at) {
  db.prepare("UPDATE cms_pages SET slug=?,title=?,description=?,keywords=?,canonical_url=?,og_image=?,sections=?,status=?,draft_content=NULL,updated_at=? WHERE id=?")
    .run(candidate.slug, candidate.title, candidate.description || "", candidate.keywords || "",
      candidate.canonical_url || "", candidate.og_image || "", JSON.stringify(candidate.sections), status, at, id);
}

export async function setCmsPageStatus(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const status = text(fd, "status");
  if (!["draft", "published"].includes(status)) throw new Error("Invalid status");
  const page = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
  if (!page) throw new Error("Page not found");
  db.transaction(() => {
    db.prepare("INSERT INTO cms_revisions (page_id, snapshot, by_user, created_at) VALUES (?,?,?,?)")
      .run(id, JSON.stringify(page), user.id, now());
    // Keep the existing URL reserved on unpublish; the pending slug becomes active only on publish.
    if (status === "published") writePageVersion(id, editablePage(page), status, now());
    else db.prepare("UPDATE cms_pages SET status=?, updated_at=? WHERE id=?").run(status, now(), id);
    audit(user.id, "cms.page.status", "cms_page", id, status);
  })();
  revalidatePath("/" + page.slug + "/");
  if (status === "published") revalidatePath("/" + editablePage(page).slug + "/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? "pages/" : ""));
}

export async function duplicateCmsPage(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const row = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
  if (!row) throw new Error("Page not found");
  const page = editablePage(row);
  let slug = page.slug + "-copy";
  let n = 2;
  while (db.prepare("SELECT 1 FROM cms_pages WHERE slug = ?").get(slug)) slug = page.slug + "-copy-" + n++;
  const t = now();
  const copyId = Number(db.prepare("INSERT INTO cms_pages (slug,title,description,keywords,canonical_url,og_image,status,sections,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(slug, page.title + " (copy)", page.description, page.keywords, page.canonical_url, page.og_image, "draft", JSON.stringify(page.sections), t, t).lastInsertRowid);
  audit(user.id, "cms.page.duplicate", "cms_page", copyId, { source: id });
  redirect(cmsPath(fd, fd.get("cms") === "1" ? `pages/${copyId}/` : `${copyId}/`));
}

export async function archiveCmsPage(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const page = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
  if (!page) throw new Error("Page not found");
  db.transaction(() => {
    db.prepare("INSERT INTO cms_revisions (page_id, snapshot, by_user, created_at) VALUES (?,?,?,?)")
      .run(id, JSON.stringify(page), user.id, now());
    db.prepare("UPDATE cms_pages SET status = 'archived', updated_at = ? WHERE id = ?").run(now(), id);
    audit(user.id, "cms.page.archive", "cms_page", id);
  })();
  revalidatePath("/" + page.slug + "/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? "pages/" : ""));
}

export async function deleteCmsPage(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const page = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
  if (!page || page.status !== "archived") throw new Error("Archive this page before deleting it permanently.");
  db.transaction(() => {
    db.prepare("DELETE FROM cms_pages WHERE id = ?").run(id);
    audit(user.id, "cms.page.delete", "cms_page", id, { slug: page.slug });
  })();
  revalidatePath("/" + page.slug + "/");
  revalidatePath("/admin/content/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? "pages/?deleted=1" : "?deleted=1"));
}

export async function saveCmsNavigation(_, fd) {
  const user = await requirePerm("content");
  let items;
  try { items = JSON.parse(text(fd, "items")); } catch { return { error: "Invalid navigation data." }; }
  if (!Array.isArray(items) || items.length > 30 || items.some((item) =>
    !item || typeof item.label !== "string" || !item.label.trim() || item.label.length > 100 ||
    typeof item.href !== "string" || !validCmsHref(item.href) ||
    !["header", "footer"].includes(item.location) || !/^[a-z0-9-]{1,50}$/.test(item.key || ""))) return { error: "Check each navigation label and link." };
  const byKey = new Map(items.map((item) => [item.key, item]));
  if (byKey.size !== items.length || items.some((item) => item.parentKey && (!byKey.has(item.parentKey) || byKey.get(item.parentKey).location !== item.location)))
    return { error: "Choose a valid parent within the same navigation area." };
  for (const item of items) {
    const seen = new Set([item.key]);
    for (let key = item.parentKey; key; key = byKey.get(key)?.parentKey) {
      if (seen.has(key)) return { error: "Navigation items cannot be nested inside themselves." };
      seen.add(key);
    }
  }
  if (fd.get("intent") === "draft") {
    setSetting("cms_navigation_draft", JSON.stringify(items));
    audit(user.id, "cms.navigation.draft", "cms_navigation", "all");
    redirect(cmsPath(fd, "navigation/?draft=1"));
  }
  db.transaction(() => {
    setSetting("cms_navigation_draft", "");
    db.prepare("DELETE FROM cms_navigation").run();
    const insert = db.prepare("INSERT INTO cms_navigation (label, href, sort_order, location, is_visible, item_key, parent_key) VALUES (?,?,?,?,?,?,?)");
    items.forEach((item, i) => insert.run(item.label.trim(), item.href, i, item.location, item.visible ? 1 : 0, item.key, item.parentKey || null));
    setSetting("cms_navigation_configured", "1");
    audit(user.id, "cms.navigation.update", "cms_navigation", "all", { count: items.length });
  })();
  revalidatePath("/", "layout");
  redirect(cmsPath(fd, "navigation/?saved=1"));
}

export async function restoreCmsRevision(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("revision_id"));
  const revision = db.prepare("SELECT r.*, p.slug AS current_slug FROM cms_revisions r JOIN cms_pages p ON p.id = r.page_id WHERE r.id = ?").get(id);
  if (!revision) throw new Error("Revision not found");
  const saved = JSON.parse(revision.snapshot);
  db.transaction(() => {
    const current = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(revision.page_id);
    db.prepare("INSERT INTO cms_revisions (page_id, snapshot, by_user, created_at) VALUES (?,?,?,?)")
      .run(revision.page_id, JSON.stringify(current), user.id, now());
    const restored = editablePage(saved);
    const candidate = { slug: restored.slug, title: restored.title, description: restored.description, keywords: restored.keywords || "",
      canonical_url: restored.canonical_url || "", og_image: restored.og_image || "", sections: restored.sections };
    db.prepare("UPDATE cms_pages SET draft_content=?,updated_at=? WHERE id=?").run(JSON.stringify(candidate), now(), revision.page_id);
    audit(user.id, "cms.page.restore", "cms_page", revision.page_id, { revision: id });
  })();
  revalidatePath("/" + revision.current_slug + "/");
  revalidatePath("/" + saved.slug + "/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? `pages/${revision.page_id}/?restored=1` : `${revision.page_id}/?restored=1`));
}

export async function uploadCmsMedia(_, fd) {
  const user = await requirePerm("content");
  const file = fd.get("file");
  const alt = text(fd, "alt_text");
  const picker = text(fd, "picker");
  const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
  if (!file || !allowed[file.type] || !file.size || file.size > 10_000_000 || alt.length > 300)
    return { error: "Choose a JPG, PNG, WebP, GIF or PDF under 10 MB and a short description." };
  if (picker === "image" && !file.type.startsWith("image/"))
    return { error: "Choose a JPG, PNG, WebP or GIF image." };
  const folderId = Number(fd.get("folder_id")) || null;
  if (folderId && !db.prepare("SELECT 1 FROM cms_media_folders WHERE id=?").get(folderId)) return { error: "Choose an existing folder." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const signatures = {
    "image/jpeg": bytes[0] === 0xff && bytes[1] === 0xd8,
    "image/png": bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
    "image/gif": ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)),
    "application/pdf": bytes.toString("ascii", 0, 5) === "%PDF-",
  };
  if (!signatures[file.type]) return { error: "The file contents do not match its type." };
  const name = randomBytes(16).toString("hex") + "." + allowed[file.type];
  const dir = path.join(DATA_DIR, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), bytes, { flag: "wx" });
  const url = "/media/" + name;
  const filename = String(file.name).slice(0, 200);
  try {
    db.transaction(() => {
      db.prepare("INSERT INTO cms_media (filename,url,mime,alt_text,size,created_at,folder_id) VALUES (?,?,?,?,?,?,?)")
        .run(filename, url, file.type, alt, bytes.length, now(), folderId);
      audit(user.id, "cms.media.upload", "cms_media", url);
    })();
  } catch (error) {
    fs.unlinkSync(path.join(dir, name));
    throw error;
  }
  if (picker === "image" || picker === "media")
    return { media: { url, filename, mime: file.type, alt_text: alt } };
  redirect(cmsPath(fd, `media/?folder=${folderId || ""}&uploaded=1`));
}

export async function deleteCmsMedia(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const media = db.prepare("SELECT * FROM cms_media WHERE id = ?").get(id);
  if (!media) throw new Error("Media not found");
  if (media.origin === "built-in") redirect(cmsPath(fd, "media/?error=builtin"));
  const pattern = "%" + media.url + "%";
  const inUse = db.prepare("SELECT 1 FROM cms_pages WHERE sections LIKE ? OR draft_content LIKE ? OR og_image=? LIMIT 1").get(pattern, pattern, media.url) ||
    db.prepare("SELECT 1 FROM settings WHERE key LIKE 'cms_%' AND value LIKE ? LIMIT 1").get(pattern) ||
    db.prepare("SELECT 1 FROM cms_route_sections WHERE sections LIKE ? OR draft_sections LIKE ? LIMIT 1").get(pattern, pattern) ||
    db.prepare("SELECT 1 FROM cms_revisions WHERE snapshot LIKE ? LIMIT 1").get(pattern) ||
    db.prepare("SELECT 1 FROM cms_route_revisions WHERE sections LIKE ? LIMIT 1").get(pattern) ||
    db.prepare("SELECT 1 FROM cms_home WHERE published LIKE ? OR draft LIKE ? LIMIT 1").get(pattern, pattern) ||
    db.prepare("SELECT 1 FROM cms_route_trees WHERE published LIKE ? OR draft LIKE ? LIMIT 1").get(pattern, pattern) ||
    db.prepare("SELECT 1 FROM cms_components WHERE section LIKE ? OR published_section LIKE ? LIMIT 1").get(pattern, pattern) ||
    db.prepare("SELECT 1 FROM cms_collection_entries WHERE data LIKE ? OR published_data LIKE ? LIMIT 1").get(pattern, pattern) ||
    db.prepare("SELECT 1 FROM events WHERE poster IN (?,?) OR gallery LIKE ? LIMIT 1").get(media.url, media.url.slice(1), pattern);
  if (inUse) redirect(cmsPath(fd, "media/?error=inuse"));
  const name = path.basename(media.url);
  if (!/^[a-f0-9]{32}\.(?:jpg|png|webp|gif|pdf)$/.test(name)) throw new Error("Invalid media filename");
  fs.unlinkSync(path.join(DATA_DIR, "uploads", name));
  db.prepare("DELETE FROM cms_media WHERE id = ?").run(id);
  audit(user.id, "cms.media.delete", "cms_media", id, { url: media.url });
  redirect(cmsPath(fd, "media/?deleted=1"));
}

export async function createCmsMediaFolder(fd) {
  const user = await requirePerm("content");
  const name = text(fd, "name").slice(0, 80);
  const parentId = Number(fd.get("parent_id")) || null;
  if (!name || /[\\/]/.test(name) || (parentId && !db.prepare("SELECT 1 FROM cms_media_folders WHERE id=?").get(parentId)))
    redirect(cmsPath(fd, "media/?error=folder"));
  db.prepare("INSERT OR IGNORE INTO cms_media_folders (name,parent_id,created_at) VALUES (?,?,?)").run(name, parentId, now());
  audit(user.id, "cms.media.folder.create", "cms_media_folder", name);
  redirect(cmsPath(fd, `media/?folder=${parentId || ""}&folder_saved=1`));
}

export async function renameCmsMediaFolder(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const name = text(fd, "name").slice(0, 80);
  if (!id || !name || /[\\/]/.test(name) || !db.prepare("SELECT 1 FROM cms_media_folders WHERE id=?").get(id))
    redirect(cmsPath(fd, "media/?error=folder"));
  try { db.prepare("UPDATE cms_media_folders SET name=? WHERE id=?").run(name, id); }
  catch { redirect(cmsPath(fd, `media/?folder=${id}&error=folder`)); }
  audit(user.id, "cms.media.folder.rename", "cms_media_folder", id);
  redirect(cmsPath(fd, `media/?folder=${id}&folder_saved=1`));
}

export async function deleteEmptyCmsMediaFolder(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const folder = db.prepare("SELECT name,parent_id FROM cms_media_folders WHERE id=?").get(id);
  if (folder && ["Website Assets", "Banners & Carousels", "Homepage Banners", "Logos & Branding", "Events & Campaigns", "Artists & People", "Gallery Images"].includes(folder.name))
    redirect(cmsPath(fd, `media/?folder=${id}&error=builtin`));
  if (!folder || db.prepare("SELECT 1 FROM cms_media_folders WHERE parent_id=?").get(id) ||
    db.prepare("SELECT 1 FROM cms_media WHERE folder_id=?").get(id))
    redirect(cmsPath(fd, `media/?folder=${id}&error=notempty`));
  db.prepare("DELETE FROM cms_media_folders WHERE id=?").run(id);
  audit(user.id, "cms.media.folder.delete", "cms_media_folder", id);
  redirect(cmsPath(fd, `media/?folder=${folder.parent_id || ""}&folder_saved=1`));
}

export async function moveCmsMedia(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const folderId = Number(fd.get("folder_id")) || null;
  if (!db.prepare("SELECT 1 FROM cms_media WHERE id=?").get(id) ||
    (folderId && !db.prepare("SELECT 1 FROM cms_media_folders WHERE id=?").get(folderId)))
    redirect(cmsPath(fd, "media/?error=folder"));
  db.prepare("UPDATE cms_media SET folder_id=? WHERE id=?").run(folderId, id);
  audit(user.id, "cms.media.move", "cms_media", id, { folderId });
  redirect(cmsPath(fd, "media/?moved=1"));
}

export async function moveCmsMediaBulk(fd) {
  const user = await requirePerm("content");
  const folderId = Number(fd.get("folder_id")) || null;
  if (folderId && !db.prepare("SELECT 1 FROM cms_media_folders WHERE id=?").get(folderId))
    redirect(cmsPath(fd, "media/?error=folder"));
  const ids = [...new Set(fd.getAll("ids").map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 300);
  if (!ids.length) redirect(cmsPath(fd, "media/?error=selection"));
  db.transaction(() => { for (const id of ids) db.prepare("UPDATE cms_media SET folder_id=? WHERE id=?").run(folderId, id); })();
  audit(user.id, "cms.media.bulk.move", "cms_media", ids.join(","), { folderId });
  redirect(cmsPath(fd, `media/?folder=${folderId || ""}&moved=1`));
}

export async function saveSiteContent(_, fd) {
  const user = await requirePerm("content");
  let content;
  try { content = JSON.parse(text(fd, "content")); } catch { return { error: "Invalid site content." }; }
  const groups = ["company", "membership", "hero", "artists", "gallery"];
  if (!content || groups.some((key) => !(key in content)) ||
    !Array.isArray(content.artists) || !Array.isArray(content.gallery) || !Array.isArray(content.hero?.slides) ||
    content.artists.length > 100 || content.gallery.length > 300 || content.hero.slides.length > 30)
    return { error: "Check the company, membership, artists, gallery and banner sections." };
  if (!content.company || typeof content.company.website !== "string" ||
    !/^https:\/\/[a-z0-9.-]+\/?$/i.test(content.company.website) ||
    [content.company.logo, content.company.favicon, content.company.ogImage].some((url) => url && !validCmsHref(url)) ||
    [content.company.primaryColor, content.company.accentColor, content.company.backgroundColor].some((color) => color && !/^#[0-9a-f]{6}$/i.test(color)))
    return { error: "Enter a valid HTTPS website URL and logo path." };
  const serialized = JSON.stringify(content);
  if (serialized.length > 500_000) return { error: "Site content is too large." };
  const previous = setting("cms_site_content");
  db.transaction(() => {
    if (previous) db.prepare("INSERT INTO cms_site_revisions (content,by_user,created_at) VALUES (?,?,?)").run(previous, user.id, now());
    setSetting("cms_site_content", serialized);
    audit(user.id, "cms.site.update", "cms_site", "main");
  })();
  revalidatePath("/", "layout");
  redirect(cmsPath(fd, "site/?saved=1"));
}

export async function restoreSiteContent(fd) {
  const user = await requirePerm("content");
  const revision = db.prepare("SELECT * FROM cms_site_revisions WHERE id = ?").get(Number(fd.get("revision_id")));
  if (!revision) throw new Error("Revision not found");
  db.transaction(() => {
    const current = setting("cms_site_content");
    if (current) db.prepare("INSERT INTO cms_site_revisions (content,by_user,created_at) VALUES (?,?,?)").run(current, user.id, now());
    setSetting("cms_site_content", revision.content);
    audit(user.id, "cms.site.restore", "cms_site", "main", { revision: revision.id });
  })();
  revalidatePath("/", "layout");
  redirect(cmsPath(fd, "site/?restored=1"));
}

async function contentEditor() {
  const u = await currentUser();
  if (!can(u, "content")) throw new Error("Not allowed");
  return u;
}

export async function saveContent(_, fd) {
  const u = await contentEditor();
  const key = String(fd.get("section") || "");
  const s = section(key);
  if (!s) return { error: "Unknown section." };
  let data;
  try { data = JSON.parse(String(fd.get("data") || "{}")); } catch { return { error: "Could not read the form. Please reload and try again." }; }
  saveSection(key, data);
  audit(u.id, "content.update", "content", key, s.title);
  revalidatePath("/", "layout");
  return { ok: `Saved. The ${s.title.toLowerCase()} is updated on the website.`, at: Date.now() };
}

export async function resetContent(fd) {
  const u = await contentEditor();
  const key = String(fd.get("section") || "");
  if (!section(key)) return;
  resetSection(key);
  audit(u.id, "content.reset", "content", key);
  revalidatePath("/", "layout");
  redirect(`/cms/edit/${key}/?reset=1`);
}

export async function deleteMedia(fd) {
  const u = await contentEditor();
  const name = safeName(fd.get("path"));
  const file = path.join(MEDIA_DIR, name);
  if (name && file.startsWith(MEDIA_DIR) && fs.existsSync(file)) { fs.unlinkSync(file); audit(u.id, "media.delete", "media", "media/" + name); }
  revalidatePath("/cms/media/");
  redirect("/cms/media/?deleted=1");
}

export async function signOutCms() {
  await endSession();
  redirect("/cms/login/");
}
