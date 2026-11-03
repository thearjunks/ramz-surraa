"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, now, audit } from "./db";
import { requirePerm } from "./auth";
import { homeVersions, validateHome } from "./home-cms";

function parseContent(fd) {
  const raw = String(fd.get("content") || "");
  if (raw.length > 120000) return null;
  try { const value = JSON.parse(raw); return validateHome(value) ? value : null; }
  catch { return null; }
}

export async function saveHomeDraft(fd) {
  const user = await requirePerm("content");
  const content = parseContent(fd);
  if (!content) redirect("/cms/home/?error=invalid");
  const current = homeVersions();
  const at = now();
  db.prepare(`INSERT INTO cms_home (id,published,draft,draft_at) VALUES (1,?,?,?)
    ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,draft_at=excluded.draft_at`)
    .run(JSON.stringify(current.published), JSON.stringify(content), at);
  audit(user.id, "cms.home.draft", "cms_home", 1);
  revalidatePath("/cms/home/");
  redirect("/cms/home/?saved=1");
}

export async function publishHome(fd) {
  const user = await requirePerm("content");
  const content = parseContent(fd);
  if (!content) redirect("/cms/home/?error=invalid");
  const current = homeVersions();
  const at = now();
  db.transaction(() => {
    db.prepare("INSERT INTO cms_home_revisions (content,by_user,created_at) VALUES (?,?,?)")
      .run(JSON.stringify(current.published), user.id, at);
    db.prepare(`INSERT INTO cms_home (id,published,draft,published_at,draft_at) VALUES (1,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET published=excluded.published,draft=excluded.draft,
      published_at=excluded.published_at,draft_at=excluded.draft_at`)
      .run(JSON.stringify(content), JSON.stringify(content), at, at);
    audit(user.id, "cms.home.publish", "cms_home", 1);
  })();
  revalidatePath("/");
  revalidatePath("/cms/home/");
  redirect("/cms/home/?published=1");
}

export async function publishHomeSection(fd) {
  const user = await requirePerm("content");
  const content = parseContent(fd);
  const id = String(fd.get("section_id") || "");
  if (!content || !content.some((section) => section.id === id)) redirect("/cms/home/?error=invalid");
  const current = homeVersions();
  const updated = current.published.map((section) => section.id === id ? content.find((draft) => draft.id === id) : section);
  const at = now();
  db.transaction(() => {
    db.prepare("INSERT INTO cms_home_revisions (content,by_user,created_at) VALUES (?,?,?)")
      .run(JSON.stringify(current.published), user.id, at);
    db.prepare(`INSERT INTO cms_home (id,published,draft,published_at,draft_at) VALUES (1,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET published=excluded.published,draft=excluded.draft,
      published_at=excluded.published_at,draft_at=excluded.draft_at`)
      .run(JSON.stringify(updated), JSON.stringify(content), at, at);
    audit(user.id, "cms.home.section.publish", "cms_home", id);
  })();
  revalidatePath("/");
  revalidatePath("/cms/home/");
  redirect(`/cms/home/?section_published=${encodeURIComponent(id)}`);
}
