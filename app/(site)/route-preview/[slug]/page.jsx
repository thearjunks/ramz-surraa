import { notFound } from "next/navigation";
import Link from "next/link";
import RouteTreePage from "@/components/RouteTreePage";
import { requirePerm } from "@/lib/auth";
import { ROUTE_TREE_SLUGS } from "@/lib/route-tree";

export default async function RoutePreview({ params }) {
  await requirePerm("content");
  const slug = (await params).slug;
  if (!ROUTE_TREE_SLUGS.includes(slug)) notFound();
  return <><div className="wrap" style={{ padding: 20 }}><b>Draft preview</b> · <Link href={`/cms/routes/${slug}/`}>Back to editor</Link></div>
    <RouteTreePage slug={slug} preview /></>;
}
