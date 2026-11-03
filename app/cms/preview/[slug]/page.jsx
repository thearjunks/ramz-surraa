import { notFound } from "next/navigation";
import CmsPage from "@/components/CmsPage";
import SiteLayout from "@/app/(site)/layout";
import { requirePerm } from "@/lib/auth";
import { cmsPage } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function CmsPreview({ params }) {
  await requirePerm("content");
  const page = cmsPage((await params).slug, true);
  if (!page) notFound();
  return <SiteLayout><CmsPage page={page} /></SiteLayout>;
}
