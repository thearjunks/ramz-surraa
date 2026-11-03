import { db } from "./db";
import { siteContent } from "./cms-site";

export const HOME_IDS = ["hero", "attend", "sundown", "membership", "artists"];
export const HOME_LABELS = {
  hero: "Banner / Hero Carousel", attend: "How to Attend", sundown: "SUNDOWN",
  membership: "Free Member Account", artists: "Our Artists",
};

export function defaultHome() {
  const site = siteContent();
  return [
    { id: "hero", visible: true, kicker: "Community Association · Kuwait", heading: "SURRAA",
      description: site.company.tagline, slides: (site.hero?.slides || []).map((s) => ({ src: s.src, pos: s.pos || "center", caption: s.caption || "" })),
      secondaryLabel: "Become a member", secondaryHref: "/membership/" },
    { id: "attend", visible: true, kicker: "Entry passes", heading: "How to attend",
      description: "Request your entry pass online. Our team confirms every request personally, then your official pass with QR code is ready.",
      steps: [
        { heading: "Request", body: "Choose an event and request your entry passes — as a member or a guest." },
        { heading: "Confirmation", body: "Our team reviews your request and contacts you on your mobile." },
        { heading: "Your pass", body: "Download your official entry pass with QR code and show it at the entrance." },
      ], trackLabel: "Track request", trackHref: "/track-entry-pass/" },
    { id: "sundown", visible: true, kicker: `${site.company.short} presents`, heading: "", description: "", poster: "", buttonLabel: "Event details" },
    { id: "membership", visible: true, kicker: "Membership", heading: "Free member account",
      description: "Create a free account to request entry passes faster — your details fill in automatically and all your passes stay in one place.",
      primaryLabel: "Create free account", primaryHref: "/register/", secondaryLabel: "Sign in", secondaryHref: "/sign-in/",
      perks: [
        { heading: "Faster requests", body: "Your details are filled in for you.", icon: "ticket" },
        { heading: "Digital membership ID", body: "Your personal SURRAA member number.", icon: "star" },
        { heading: "Pass history", body: "Upcoming and past entry passes in one place.", icon: "cal" },
      ] },
    { id: "artists", visible: true, kicker: "On stage", heading: "Our artists", buttonLabel: "All artists", buttonHref: "/artists/",
      people: (site.artists || []).filter((a) => a.photo).slice(0, 4).map((a) => ({ slug: a.slug, name: a.name, photo: a.photo, role: a.role || "", group: a.group || "" })) },
  ];
}

export function homeVersions() {
  const row = db.prepare("SELECT * FROM cms_home WHERE id=1").get();
  const fallback = defaultHome();
  return { published: row ? JSON.parse(row.published) : fallback,
    draft: row?.draft ? JSON.parse(row.draft) : row ? JSON.parse(row.published) : fallback,
    publishedAt: row?.published_at || null, draftAt: row?.draft_at || null };
}

export function validateHome(value) {
  if (!Array.isArray(value) || value.length !== HOME_IDS.length ||
    new Set(value.map((s) => s.id)).size !== HOME_IDS.length || value.some((s) => !HOME_IDS.includes(s.id))) return false;
  const validText = (x, max = 5000) => typeof x === "string" && x.length <= max;
  const validLink = (x) => !x || (validText(x, 500) && (/^\/(?!\/)/.test(x) || /^https:\/\//.test(x)));
  const validImage = (x) => !x || (validText(x, 500) && (/^(?:\/(?!\/)|images\/|https:\/\/)/.test(x)));
  return value.every((section) => {
    if (typeof section.visible !== "boolean" || !validText(section.kicker || "", 160) ||
      !validText(section.heading || "", 300) || !validText(section.description || "")) return false;
    if (section.id === "hero") return Array.isArray(section.slides) && section.slides.length <= 20 &&
      section.slides.every((s) => validImage(s.src) && validText(s.pos || "", 100) && validText(s.caption || "", 200)) && validLink(section.secondaryHref);
    if (section.id === "attend") return Array.isArray(section.steps) && section.steps.length <= 12 &&
      section.steps.every((s) => validText(s.heading || "", 200) && validText(s.body || "")) && validLink(section.trackHref);
    if (section.id === "sundown") return validImage(section.poster);
    if (section.id === "membership") return Array.isArray(section.perks) && section.perks.length <= 12 &&
      section.perks.every((s) => validText(s.heading || "", 200) && validText(s.body || "")) && validLink(section.primaryHref) && validLink(section.secondaryHref);
    return Array.isArray(section.people) && section.people.length <= 24 && section.people.every((p) =>
      validText(p.name || "", 160) && validText(p.slug || "", 160) && validText(p.role || "", 160) && validImage(p.photo)) && validLink(section.buttonHref);
  });
}
