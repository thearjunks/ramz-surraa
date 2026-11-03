"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePerm } from "./auth";
import { audit, setSetting } from "./db";

export async function saveGlobalContent(fd) {
  const user = await requirePerm("content");
  const kind = String(fd.get("kind") || "");
  if (!["header", "footer"].includes(kind)) redirect("/cms/site/");
  const keys = kind === "header" ? ["logo", "label"] : ["logo", "heading", "description", "copyright"];
  const content = Object.fromEntries(keys.map((key) => [key, String(fd.get(key) || "").trim()]));
  if (keys.some((key) => content[key].length > 500) || !/^(?:\/(?!\/)|https:\/\/)/.test(content.logo))
    redirect(`/cms/site/${kind}/?error=invalid`);
  const publish = fd.get("intent") === "publish";
  setSetting(`cms_${kind}_draft`, JSON.stringify(content));
  if (publish) setSetting(`cms_${kind}_content`, JSON.stringify(content));
  audit(user.id, `cms.${kind}.update`, "settings", `cms_${kind}_content`);
  revalidatePath("/", "layout");
  redirect(`/cms/site/${kind}/?${publish ? "published" : "saved"}=1`);
}
