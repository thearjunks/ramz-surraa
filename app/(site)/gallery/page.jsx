import RouteTreePage from "@/components/RouteTreePage";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";
export function generateMetadata() { const page = cmsPage("gallery"); return page ? cmsMetadata(page) : { title: "Gallery | SURRAA Community Association", description: "Photos of SURRAA artists and live performances." }; }
export default function GalleryPage() { const page = cmsPage("gallery"); return page ? <CmsPage page={page} /> : <RouteTreePage slug="gallery" />; }
