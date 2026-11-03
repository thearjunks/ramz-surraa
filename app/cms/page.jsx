import { redirect } from "next/navigation";
import AdminLayout from "@/app/admin/(panel)/layout";
import ContentPages from "@/app/admin/(panel)/content/page";
import { currentUser, can, isStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "CMS | SURRAA", robots: { index: false, follow: false } };

export default async function CmsEntry() {
  const user = await currentUser();
  if (!isStaff(user)) redirect("/admin/login/?next=/cms/");
  if (!can(user, "content")) redirect("/admin/?denied=1");
  return <AdminLayout><ContentPages /></AdminLayout>;
}
