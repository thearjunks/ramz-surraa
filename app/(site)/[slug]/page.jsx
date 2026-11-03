import { notFound } from "next/navigation";
import CmsPage from "@/components/CmsPage";
import { cmsPage, cmsMetadata } from "@/lib/cms";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  const page = cmsPage((await params).slug);
  return cmsMetadata(page);
}
export default async function CustomPage({ params, searchParams }) {
  const slug = (await params).slug;
  const preview = (await searchParams).preview === "1";
  const page = cmsPage(slug, preview);
  if (!page) notFound();
  if (preview) {
    const { requirePerm } = await import("@/lib/auth");
    await requirePerm("content");
  }
  return <CmsPage page={page} />;
}
