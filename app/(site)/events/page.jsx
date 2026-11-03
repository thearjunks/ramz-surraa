import RouteTreePage from "@/components/RouteTreePage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Upcoming Events | SURRAA Community Association Kuwait", description: "Upcoming concerts and community events in Kuwait. Request your entry pass online." };
export default function Events() { return <RouteTreePage slug="events" />; }
