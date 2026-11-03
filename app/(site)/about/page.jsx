import RouteTreePage from "@/components/RouteTreePage";
import { cmsPage, cmsMetadata } from "@/lib/cms";
import CmsPage from "@/components/CmsPage";

export function generateMetadata() { const page = cmsPage("about"); return page ? cmsMetadata(page) : { title: "About Us | SURRAA Community Association Kuwait", description: "SURRAA Community Association brings our community in Kuwait together through live music and events." }; }
export default function About() { const page = cmsPage("about"); return page ? <CmsPage page={page} /> : <RouteTreePage slug="about" />; }
