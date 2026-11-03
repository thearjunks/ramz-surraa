import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import CmsPage from "@/components/CmsPage";
export default async function ComponentPreview({ params }) {
  await requirePerm("content");
  const row = db.prepare("SELECT name,section FROM cms_components WHERE id=?").get(Number((await params).id));
  if (!row) notFound();
  return <><p>Saved draft preview · {row.name}</p><CmsPage page={{ sections: [JSON.parse(row.section)] }} /></>;
}
