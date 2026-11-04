import Link from "next/link";
import Icon from "@/components/Icon";
import { getContent, sectionValue } from "@/lib/content";
import { currentUser, can } from "@/lib/auth";

export const metadata = { title: "All website images" };
export const dynamic = "force-dynamic";

const ed = (k) => `/cms/edit/${k}/`;
const img = (p) => (!p ? "" : /^https?:/.test(p) ? p : "/" + p.replace(/^\//, ""));

function Slot({ s }) {
  return (
    <Link className="slot" href={s.href}>
      <span className={"ph" + (s.src ? "" : " none") + (s.logo ? " logo" : "")}>
        {s.src ? <img src={img(s.src)} alt="" loading="lazy" /> : <><Icon name="image" />No photo yet</>}
        <span className="chg">{s.src ? "Change" : "Add"}</span>
      </span>
      <b>{s.label}</b>{s.note && <small>{s.note}</small>}
    </Link>
  );
}

export default async function AllImages() {
  if (!can(await currentUser(), "content")) return null;
  const c = getContent(), P = c.pages || {};
  const events = sectionValue("events").items;
  const shown = Number(P.home?.artistsCount) || 4;
  const groups = [
    { t: "Logo", note: "Menu bar, footer, entry passes", edit: ed("branding"), slots: [
      { label: "Main logo", src: P.branding?.logo, href: ed("branding"), logo: true },
      { label: "Footer logo", src: P.branding?.footerLogo || P.branding?.logo, note: P.branding?.footerLogo ? "" : "Same as main logo", href: ed("branding"), logo: true }] },
    { t: "Home page — banner", note: "Photos that fade one into the next", edit: ed("home"), slots: (c.hero?.slides || []).map((s, i) => ({ label: s.caption || `Banner photo ${i + 1}`, note: `Photo ${i + 1}`, src: s.src, href: ed("home") })) },
    { t: "Home page — next event & artists", note: "Event poster and the artist photos shown on the home page", edit: ed("events"), slots: [
      ...events.slice(0, 1).map((e) => ({ label: "Next event poster", note: e.name, src: e.poster, href: ed("events") })),
      ...(c.artists || []).filter((a) => a.photo).slice(0, shown).map((a) => ({ label: a.name, note: "Artist photo", src: a.photo, href: ed("artists") }))] },
    { t: "Events", note: "Posters and event-page photos", edit: ed("events"), slots: [
      { label: "Events page header", src: P.eventsPage?.heroImage, href: ed("eventsPage") },
      ...events.flatMap((e) => [{ label: e.name.split(" · ")[0] + " — poster", note: e.name.split(" · ")[1], src: e.poster, href: ed("events") },
        ...e.gallery.map((g, i) => ({ label: `${e.name.split(" · ")[0]} — photo ${i + 1}`, src: g, href: ed("events") }))])] },
    { t: "About page", edit: ed("about"), slots: [
      { label: "Page header", src: P.about?.heroImage, href: ed("about") },
      { label: "Photo 1", src: P.about?.photo1, href: ed("about") }, { label: "Photo 2", src: P.about?.photo2, href: ed("about") }] },
    { t: "Artists page", edit: ed("artists"), slots: [
      { label: "Page header", src: P.artistsPage?.heroImage, href: ed("artists") },
      ...(c.artists || []).map((a) => ({ label: a.name, note: a.role, src: a.photo, href: ed("artists") }))] },
    { t: "Gallery page", edit: ed("gallery"), slots: [
      { label: "Page header", src: P.galleryPage?.heroImage, href: ed("gallery") },
      ...(c.gallery || []).map((g, i) => ({ label: g.alt || `Photo ${i + 1}`, src: g.src, href: ed("gallery") }))] },
    { t: "Other pages", note: "Optional header photos", slots: [
      { label: "Membership — header", src: P.membershipPage?.heroImage, href: ed("membershipPage") },
      { label: "Contact — header", src: P.contactPage?.heroImage, href: ed("contactPage") },
      { label: "Privacy — header", src: P.privacy?.heroImage, href: ed("privacy") },
      { label: "Terms — header", src: P.terms?.heroImage, href: ed("terms") }] },
    { t: "Sharing", note: "Shown when a link is shared on WhatsApp or social media", edit: ed("seo"), slots: [{ label: "Share image", src: c.seo?.shareImage, href: ed("seo") }] },
  ];
  const total = groups.reduce((n, g) => n + g.slots.filter((s) => s.src).length, 0);
  return (
    <>
      <div className="cms-head">
        <div><Link className="crumb" href="/cms/"><Icon name="left" />Overview</Link><h1>All website images</h1>
          <p>Every photo on the website, page by page — {total} in use. Click any image to change it.</p></div>
        <Link className="btn btn-primary" href="/cms/media/"><Icon name="upload" />Upload new images</Link>
      </div>
      <div className="img-map">
        {groups.map((g) => (
          <section key={g.t} className="k-card img-sec">
            <div className="card-h"><h2>{g.t} {g.note && <small>· {g.note}</small>}</h2>{g.edit && <Link className="btn btn-sm" href={g.edit}><Icon name="edit" />Edit</Link>}</div>
            <div className="slots">{g.slots.map((s, i) => <Slot key={i} s={s} />)}</div>
            {!g.slots.length && <p className="muted small">Nothing here yet.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
