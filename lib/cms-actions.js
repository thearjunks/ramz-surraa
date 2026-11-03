"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, now, audit, DATA_DIR } from "./db";
import { requirePerm } from "./auth";
import { validCmsSlug, validCmsHref } from "./cms";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { setting, setSetting } from "./db";
import { SITE_ROUTES } from "./cms";

const text = (fd, key) => String(fd.get(key) || "").trim();
const cmsPath = (fd, path = "") => fd.get("cms") === "1" ? `/cms/${path}` : `/admin/content/${path}`;
const types = new Set(["hero", "text", "image", "cta", "artists", "gallery", "events", "component"]);

export async function saveCmsRoute(_, fd) {
  const user = await requirePerm("content");
  const slug = text(fd, "slug");
  const status = text(fd, "status");
  if (!SITE_ROUTES.some((route) => route[2] === slug) || !["draft", "published"].includes(status))
    return { error: "Invalid page or status." };
  let sections;
  try { sections = JSON.parse(text(fd, "sections")); } catch { return { error: "Invalid page sections." }; }
  if (!Array.isArray(sections) || sections.length > 40 || sections.some((section) =>
    !section || !types.has(section.type) ||
    [section.heading, section.body, section.image, section.buttonLabel, section.buttonHref].some((value) =>
      value !== undefined && (typeof value !== "string" || value.length > 10000)) ||
    (section.image && !validCmsHref(section.image)) || (section.buttonHref && !validCmsHref(section.buttonHref)) ||
    (section.type === "component" && !db.prepare("SELECT 1 FROM cms_components WHERE id=?").get(Number(section.componentId)))
  )) return { error: "Check the page sections and links." };
  const old = db.prepare("SELECT * FROM cms_route_sections WHERE slug=?").get(slug);
  const at = now();
  db.transaction(() => {
    if (old) db.prepare("INSERT INTO cms_route_revisions (slug, sections, status, by_user, created_at) VALUES (?,?,?,?,?)")
      .run(slug, old.sections, old.status, user.id, at);
    db.prepare("INSERT INTO cms_route_sections (slug, sections, status, updated_at) VALUES (?,?,?,?) ON CONFLICT(slug) DO UPDATE SET sections=excluded.sections,status=excluded.status,updated_at=excluded.updated_at")
      .run(slug, JSON.stringify(sections), status, at);
    audit(user.id, "cms.route.save", "cms_route", slug, { status });
  })();
  const route = SITE_ROUTES.find((item) => item[2] === slug)[1];
  revalidatePath(route);
  redirect(`/cms/routes/${slug}/?saved=1`);
}

export async function saveCmsComponent(_, fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id")) || 0;
  const name = text(fd, "name").slice(0, 100);
  let sections;
  try { sections = JSON.parse(text(fd, "sections")); } catch { return { error: "Invalid component." }; }
  const section = sections?.[0];
  if (!name || sections.length !== 1 || !section || !types.has(section.type) || section.type === "component" ||
    [section.heading, section.body, section.image, section.buttonLabel, section.buttonHref].some((value) =>
      value !== undefined && (typeof value !== "string" || value.length > 10000)) ||
    (section.image && !validCmsHref(section.image)) || (section.buttonHref && !validCmsHref(section.buttonHref)))
    return { error: "Enter a name and one valid section." };
  const at = now();
  try {
    if (id) db.prepare("UPDATE cms_components SET name=?, section=?, updated_at=? WHERE id=?")
      .run(name, JSON.stringify(section), at, id);
    else db.prepare("INSERT INTO cms_components (name,section,created_at,updated_at) VALUES (?,?,?,?)")
      .run(name, JSON.stringify(section), at, at);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return { error: "A component already has that name." };
    throw error;
  }
  audit(user.id, id ? "cms.component.update" : "cms.component.create", "cms_component", id || name);
  revalidatePath("/cms/components/");
  redirect("/cms/components/?saved=1");
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
  if (sections.length > 40 || sections.some((s) => !s || !types.has(s.type) ||
    (s.type === "component" && (!Number.isInteger(Number(s.componentId)) || !db.prepare("SELECT 1 FROM cms_components WHERE id = ?").get(Number(s.componentId)))) ||
    [s.heading, s.body, s.image, s.buttonLabel, s.buttonHref].some((x) => typeof x !== "undefined" && (typeof x !== "string" || x.length > 10000)) ||
    (s.buttonHref && !validCmsHref(s.buttonHref)) || (s.image && !validCmsHref(s.image))))
    return { error: "A section contains unsupported content or a link." };
  const t = now();
  let pageId = id;
  try {
    db.transaction(() => {
      if (id) {
        const old = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
        if (!old) throw new Error("Page not found");
        db.prepare("INSERT INTO cms_revisions (page_id, snapshot, by_user, created_at) VALUES (?,?,?,?)")
          .run(id, JSON.stringify(old), user.id, t);
        db.prepare("UPDATE cms_pages SET slug=?, title=?, description=?, keywords=?, canonical_url=?, og_image=?, status=?, sections=?, updated_at=? WHERE id=?")
          .run(slug, title, description, keywords, canonical, ogImage, status, JSON.stringify(sections), t, id);
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
    db.prepare("UPDATE cms_pages SET status=?, updated_at=? WHERE id=?").run(status, now(), id);
    audit(user.id, "cms.page.status", "cms_page", id, status);
  })();
  revalidatePath("/" + page.slug + "/");
  redirect(cmsPath(fd, fd.get("cms") === "1" ? "pages/" : ""));
}

export async function duplicateCmsPage(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const page = db.prepare("SELECT * FROM cms_pages WHERE id = ?").get(id);
  if (!page) throw new Error("Page not found");
  let slug = page.slug + "-copy";
  let n = 2;
  while (db.prepare("SELECT 1 FROM cms_pages WHERE slug = ?").get(slug)) slug = page.slug + "-copy-" + n++;
  const t = now();
  const copyId = Number(db.prepare("INSERT INTO cms_pages (slug,title,description,keywords,canonical_url,og_image,status,sections,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(slug, page.title + " (copy)", page.description, page.keywords, page.canonical_url, page.og_image, "draft", page.sections, t, t).lastInsertRowid);
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
    !["header", "footer"].includes(item.location))) return { error: "Check each navigation label and link." };
  db.transaction(() => {
    db.prepare("DELETE FROM cms_navigation").run();
    const insert = db.prepare("INSERT INTO cms_navigation (label, href, sort_order, location, is_visible) VALUES (?,?,?,?,?)");
    items.forEach((item, i) => insert.run(item.label.trim(), item.href, i, item.location, item.visible ? 1 : 0));
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
    db.prepare("UPDATE cms_pages SET slug=?, title=?, description=?, keywords=?, canonical_url=?, og_image=?, status=?, sections=?, updated_at=? WHERE id=?")
      .run(saved.slug, saved.title, saved.description, saved.keywords || "", saved.canonical_url || "", saved.og_image || "", saved.status, saved.sections, now(), revision.page_id);
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
  const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
  if (!file || !allowed[file.type] || !file.size || file.size > 10_000_000 || alt.length > 300)
    return { error: "Choose a JPG, PNG, WebP, GIF or PDF under 10 MB and a short description." };
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
  db.prepare("INSERT INTO cms_media (filename,url,mime,alt_text,size,created_at) VALUES (?,?,?,?,?,?)")
    .run(String(file.name).slice(0, 200), url, file.type, alt, bytes.length, now());
  audit(user.id, "cms.media.upload", "cms_media", url);
  redirect(cmsPath(fd, "media/?uploaded=1"));
}

export async function deleteCmsMedia(fd) {
  const user = await requirePerm("content");
  const id = Number(fd.get("id"));
  const media = db.prepare("SELECT * FROM cms_media WHERE id = ?").get(id);
  if (!media) throw new Error("Media not found");
  const pattern = "%" + media.url + "%";
  const inUse = db.prepare("SELECT 1 FROM cms_pages WHERE sections LIKE ? LIMIT 1").get(pattern) ||
    db.prepare("SELECT 1 FROM settings WHERE key = 'cms_site_content' AND value LIKE ? LIMIT 1").get(pattern) ||
    db.prepare("SELECT 1 FROM events WHERE poster = ? OR gallery LIKE ? LIMIT 1").get(media.url.slice(1), pattern);
  if (inUse) redirect(cmsPath(fd, "media/?error=inuse"));
  const name = path.basename(media.url);
  if (!/^[a-f0-9]{32}\.(?:jpg|png|webp|gif|pdf)$/.test(name)) throw new Error("Invalid media filename");
  fs.unlinkSync(path.join(DATA_DIR, "uploads", name));
  db.prepare("DELETE FROM cms_media WHERE id = ?").run(id);
  audit(user.id, "cms.media.delete", "cms_media", id, { url: media.url });
  redirect(cmsPath(fd, "media/?deleted=1"));
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
