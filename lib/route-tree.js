import { db, DEFAULT_TERMS } from "./db";
import { siteContent } from "./cms-site";

export const ROUTE_TREE_SLUGS = ["about", "events", "events-past", "gallery", "membership", "contact", "artists", "privacy", "terms"];

export function defaultRouteTree(slug) {
  const c = siteContent().company;
  const hero = (heading, body = "") => ({ id: "hero", type: "hero", label: "Page header", visible: true, heading, body });
  const section = (id, type, label, options = {}) => ({ id, type, label, visible: true, heading: "", body: "", ...options });
  switch (slug) {
    case "about": return [
      hero("About SURRAA", c.tagline),
      section("story", "story", "Who we are", { kicker: "Who we are", heading: "Music that brings people together",
        body: `${c.name} connects our community in Kuwait through live music, local and international artists, and shared experiences.`,
        items: [{ heading: "Our first concert", body: "Our first concert, SUNDOWN – Chapter 1, brings artists from Sri Lanka together with Kuwait-based performers." }],
        images: ["/images/g-ambika-mono.jpg", "/images/g-ramz-live.jpg"] }),
    ];
    case "events": return [hero("Upcoming events"), section("list", "events", "Upcoming event cards", { heading: "", body: "New events coming soon", items: [{ heading: "Empty state", body: "Create a free account to hear about the next one first." }] })];
    case "events-past": return [hero("Past events"), section("list", "past-events", "Past event cards", { body: "Our story is just beginning", items: [{ heading: "Empty state", body: "Past events will appear here." }] })];
    case "gallery": return [hero("Gallery"), section("gallery", "gallery", "Photo gallery", { heading: "", body: "",
      items: (siteContent().gallery || []).map((image) => ({ ...image, src: image.src || "", alt: image.alt || "" })) })];
    case "membership": return [
      hero("Become a member", "Free to join. Membership does not confirm an entry pass by itself — every pass is still confirmed by our team."),
      section("benefits", "benefits", "Membership benefits", { items: [
        { heading: "Faster entry pass requests", body: "Your name, mobile, nationality and Civil ID are filled in automatically.", icon: "ticket" },
        { heading: "Digital membership ID", body: "Your personal SURRAA member number in your account.", icon: "star" },
        { heading: "Upcoming & past events", body: "All your requests, confirmations and passes in one place.", icon: "cal" },
        { heading: "Pass tracking", body: "Follow every request from submitted to confirmed.", icon: "search" },
        { heading: "Member invitations", body: "Access to member-only events when we announce them.", icon: "users" },
      ] }),
      section("account", "account", "Account actions", { kicker: "Free account", heading: "Join in a minute", body: "Name, mobile, email and a password — that's all." }),
    ];
    case "contact": return [
      hero("Contact us"),
      section("details", "contact-details", "Contact details", { items: [
        { heading: "Email", key: "email", icon: "mail" }, { heading: "Phone", key: "phone", icon: "phone" },
        { heading: "SUNDOWN enquiries", key: "passesPhone", icon: "ticket" }, { heading: "Location", key: "location", icon: "pin" },
      ] }),
      section("form", "contact-form", "Message form", { heading: "Send a message" }),
    ];
    case "artists": return [
      hero("Our artists"),
      section("guest", "artist-group", "Artists from Sri Lanka", { kicker: "SUNDOWN – Chapter 1", heading: "From Sri Lanka", group: "guest",
        items: (siteContent().artists || []).filter((a) => a.group === "guest").map((a) => ({ ...a, slug: a.slug || "", name: a.name || "", role: a.role || "", photo: a.photo || "" })) }),
      section("team", "artist-group", "SURRAA artists", { kicker: "Kuwait", heading: "SURRAA artists", group: "team",
        items: (siteContent().artists || []).filter((a) => a.group === "team").map((a) => ({ ...a, slug: a.slug || "", name: a.name || "", role: a.role || "", photo: a.photo || "" })) }),
    ];
    case "privacy": return [
      hero("Privacy policy", "How we handle the information you share with us."),
      section("policy", "article", "Privacy policy text", { body: "Template — please review with your legal adviser before publishing.", items: [
        { heading: "Information we collect", body: "When you create an account, request an entry pass or contact us, we collect the details you provide: name, mobile / WhatsApp number, email, nationality and — for entry pass requests — your Kuwait Civil ID number. We also record the date and time of your request and the page it was made from." },
        { heading: "How we use it", body: "We use your information to manage your account and entry pass requests, verify identity at the entrance, contact you about your requests and events, and respond to your messages. We do not sell your personal information." },
        { heading: "Civil ID", body: "Your Civil ID number is stored encrypted, is visible only to authorised staff, and never appears on entry passes, QR codes or links. It is used only to verify entry pass requests and prevent duplicates." },
        { heading: "Third-party services", body: "This website uses Google Fonts, Google Maps. These services may collect technical data according to their own privacy policies." },
        { heading: "Retention & your rights", body: "We keep request data only as long as needed for the event and legitimate records, and delete Civil ID numbers when they are no longer required. You can ask us to access, correct or delete your information, or unsubscribe at any time, by emailing info@surraa.com." },
        { heading: "Contact", body: "SURRAA Community Association, Kuwait — info@surraa.com" },
      ] }),
    ];
    case "terms": return [
      hero("Terms & conditions"),
      section("conditions", "article", "Terms and conditions text", { body: "Template — please review with your legal adviser before publishing.", items: [
        { heading: "Entry passes", body: `${DEFAULT_TERMS}\n\nSubmitting a request does not guarantee admission. Requests are confirmed by SURRAA Community Association at its discretion and may be declined, cancelled or expire. Each event may have additional terms shown on its page.` },
        { heading: "Your account", body: "Keep your password private. You are responsible for requests made from your account. We may suspend accounts that misuse the service." },
        { heading: "Event information", body: "Line-ups, times and venues may change. The latest information is published on this website." },
        { heading: "Contact", body: "info@surraa.com" },
      ] }),
    ];
    default: return [];
  }
}

export function routeTreeVersions(slug) {
  const row = db.prepare("SELECT * FROM cms_route_trees WHERE slug=?").get(slug);
  const fallback = defaultRouteTree(slug);
  return { published: row ? JSON.parse(row.published) : fallback,
    draft: row?.draft ? JSON.parse(row.draft) : row ? JSON.parse(row.published) : fallback,
    publishedAt: row?.published_at || null, draftAt: row?.draft_at || null };
}

export function validateRouteTree(slug, nodes) {
  const expected = defaultRouteTree(slug);
  const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const text = (value, max = 12000) => value === undefined || typeof value === "string" && value.length <= max;
  const image = (value) => value === undefined || value === "" || typeof value === "string" && value.length <= 1000 && /^(?:\/(?!\/)|images\/|https:\/\/)/.test(value);
  if (!expected.length || !Array.isArray(nodes) || nodes.length !== expected.length || nodes.some((n) => !plain(n)) ||
    new Set(nodes.map((n) => n.id)).size !== expected.length || nodes.some((n) => !expected.some((e) => e.id === n.id && e.type === n.type))) return false;
  return nodes.every((n) => typeof n.visible === "boolean" && ["label", "heading", "body", "kicker"].every((k) => text(n[k])) &&
    (n.items === undefined || Array.isArray(n.items) && n.items.length <= (n.type === "gallery" ? 300 : n.type === "artist-group" ? 100 : 40) && n.items.every((item) =>
      plain(item) && ["heading", "body", "icon", "key", "src", "alt", "slug", "name", "role", "photo"].every((k) => text(item[k])) &&
      [item.src, item.photo].every(image) && (n.type !== "contact-details" || ["email", "phone", "passesPhone", "location"].includes(item.key)))) &&
    (n.images === undefined || Array.isArray(n.images) && n.images.length <= 12 && n.images.every(image)));
}
