import RouteTreePage from "@/components/RouteTreePage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Past Events | SURRAA Community Association Kuwait", description: "Concerts and events organised by SURRAA Community Association." };
export default function PastEvents() { return <RouteTreePage slug="events-past" />; }
