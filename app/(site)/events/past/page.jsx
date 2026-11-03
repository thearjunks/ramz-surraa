import { PageHero } from "@/components/ui";
import { EventCard } from "@/components/blocks";
import { publicEvents, view } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past Events | SURRAA Community Association Kuwait", description: "Concerts and events organised by SURRAA Community Association." };

export default function PastEvents() {
  const list = publicEvents(true).map(view);
  return (
    <>
      <PageHero crumb="Past Events"><h1>Past <span className="grad">events</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap grid">
        {list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <div className="empty"><h3>Our story is just beginning</h3><p>Past events will appear here.</p></div>}
      </div></section>
    </>
  );
}
