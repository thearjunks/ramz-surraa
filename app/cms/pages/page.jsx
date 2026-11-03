import ContentPages from "@/app/admin/(panel)/content/page";

export const dynamic = "force-dynamic";
export default function CmsPages(props) { return <ContentPages {...props} cms />; }
