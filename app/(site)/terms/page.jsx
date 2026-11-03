import RouteTreePage from "@/components/RouteTreePage";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";
export function generateMetadata() { const page = cmsPage("terms"); return page ? cmsMetadata(page) : { title: "Terms & Conditions | SURRAA Community Association", description: "Terms for entry pass requests and use of this website." }; }
export default function Terms() { const page = cmsPage("terms"); return page ? <CmsPage page={page} /> : <RouteTreePage slug="terms" />; }
