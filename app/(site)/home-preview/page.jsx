import { requirePerm } from "@/lib/auth";
import { homeVersions } from "@/lib/home-cms";
import { HomeView } from "@/app/(site)/page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage draft preview | SURRAA", robots: { index: false, follow: false } };

export default async function HomePreview() {
  await requirePerm("content");
  return <><div className="cms-preview-bar">Draft preview — visitors still see the current published homepage.</div>
    <HomeView sections={homeVersions().draft} preview /></>;
}
