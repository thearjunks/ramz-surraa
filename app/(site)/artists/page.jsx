import RouteTreePage from "@/components/RouteTreePage";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";
export function generateMetadata() { const page = cmsPage("artists"); return page ? cmsMetadata(page) : { title: "Artists | SURRAA Community Association", description: "SURRAA artists and the guest artists of SUNDOWN – Chapter 1." }; }
export default function Artists() { const page = cmsPage("artists"); return page ? <CmsPage page={page} /> : <RouteTreePage slug="artists" />; }
