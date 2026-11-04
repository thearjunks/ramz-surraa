import { PageHero, Grad } from "@/components/ui";
import { page } from "@/lib/site";
import { EventCard } from "@/components/blocks";
import { publicEvents, view } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upcoming Events | SURRAA Community Association Kuwait", description: "Upcoming concerts and community events in Kuwait. Request your entry pass online." };

export default function Events() {
  const list = publicEvents().map(view);
  const P = page("eventsPage");
  return (
    <>
      <PageHero crumb="Upcoming Events" lead={P.lead} image={P.heroImage}><h1><Grad t={P.title} /></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap grid">
        {list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <div className="empty"><h3>New events coming soon</h3><p>Create a free account to hear about the next one first.</p></div>}
      </div></section>
    </>
  );
}
