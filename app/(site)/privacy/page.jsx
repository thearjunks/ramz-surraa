import RouteTreePage from "@/components/RouteTreePage";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";
export function generateMetadata() { const page = cmsPage("privacy"); return page ? cmsMetadata(page) : { title: "Privacy Policy | SURRAA Community Association", description: "Privacy policy for the SURRAA Community Association website." }; }
export default function Privacy() { const page = cmsPage("privacy"); return page ? <CmsPage page={page} /> : <RouteTreePage slug="privacy" />; }
