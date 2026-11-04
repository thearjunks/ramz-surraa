// What the CMS can edit: one entry per section, the fields it shows and where it appears on the site.
// Pure data — used by the CMS editor (client) and the save action (server).
// Titles: words between *stars* are shown in the brand colour gradient.

const ICONS = [["ticket", "Ticket"], ["star", "Star"], ["cal", "Calendar"], ["users", "People"], ["search", "Search"], ["clock", "Clock"], ["pin", "Location"], ["mail", "Email"], ["phone", "Phone"]];
const steps = (label, add) => ({ name: label[0], label: label[1], type: "list", add, item: [{ name: "title", label: "Title" }, { name: "text", label: "Text", type: "textarea" }] });
const points = (name, label, add) => ({ name, label, type: "list", add, item: [{ name: "icon", label: "Icon", type: "select", options: ICONS }, { name: "title", label: "Title" }, { name: "text", label: "Text", type: "textarea" }] });
const HERO = { name: "heroImage", label: "Page header photo", type: "image", hint: "Optional — shown softly behind the page title." };
const legal = [
  { type: "section", label: "Page top" },
  { name: "title", label: "Page title" }, { name: "lead", label: "Intro line", type: "textarea" }, HERO,
  { type: "section", label: "Content", hint: "Each block is a heading with its text. Leave a blank line between paragraphs." },
  { name: "sections", label: "Blocks", type: "list", add: "Add block", item: [{ name: "heading", label: "Heading" }, { name: "text", label: "Text", type: "textarea", rows: 5 }] },
];

export const SECTIONS = [
  // ---------- Pages ----------
  {
    key: "home", group: "Pages", title: "Home page", icon: "home", url: "/",
    desc: "Banner photos, headline and every block on the home page.",
    fields: [
      { type: "section", label: "Banner", hint: "The big animated area at the top. Photos fade one into the next." },
      { name: "heroKicker", label: "Small line above the title" },
      { name: "heroTitle", label: "Big title" },
      { name: "heroButton2", label: "Second button text" },
      { name: "slides", label: "Banner photos", type: "list", add: "Add photo", item: [
        { name: "src", label: "Photo", type: "image" },
        { name: "caption", label: "Caption" },
        { name: "pos", label: "Focus point", type: "select", options: [["center 30%", "Top"], ["center 45%", "Upper middle"], ["center 50%", "Middle"], ["center 62%", "Lower middle"], ["center 80%", "Bottom"]] },
      ] },
      { type: "section", label: "How to attend", hint: "Tagline under the banner title is edited in Website details." },
      { name: "attendKicker", label: "Small heading" }, { name: "attendTitle", label: "Title" }, { name: "attendLead", label: "Intro", type: "textarea" },
      steps(["attendSteps", "Steps"], "Add step"),
      { name: "trackSmall", label: "Track box — small line" }, { name: "trackTitle", label: "Track box — title" },
      { type: "section", label: "Membership block" },
      { name: "memberKicker", label: "Small heading" }, { name: "memberTitle", label: "Title" }, { name: "memberLead", label: "Intro", type: "textarea" },
      points("memberPoints", "Benefits", "Add benefit"),
      { type: "section", label: "Artists block", hint: "Shows artists that have a photo. Manage them under Artists." },
      { name: "artistsKicker", label: "Small heading" }, { name: "artistsTitle", label: "Title" },
      { name: "artistsCount", label: "How many to show", type: "select", options: [["3", "3"], ["4", "4"], ["6", "6"], ["8", "8"]] },
    ],
  },
  {
    key: "about", group: "Pages", title: "About page", icon: "info", url: "/about/",
    desc: "Who you are, the story and two photos.",
    fields: [
      { type: "section", label: "Page top" },
      { name: "title", label: "Page title" }, { name: "lead", label: "Intro line", type: "textarea", hint: "Leave empty to use the tagline from Website details." }, HERO,
      { type: "section", label: "Story" },
      { name: "kicker", label: "Small heading" }, { name: "heading", label: "Heading" },
      { name: "intro", label: "First paragraph (large)", type: "textarea" }, { name: "body", label: "More text", type: "textarea", rows: 5 },
      { type: "section", label: "Photos" },
      { name: "photo1", label: "Photo 1", type: "image" }, { name: "photo2", label: "Photo 2", type: "image" },
    ],
  },
  {
    key: "membershipPage", group: "Pages", title: "Membership page", icon: "users", url: "/membership/",
    desc: "Member benefits and the join box.",
    fields: [
      { type: "section", label: "Page top" },
      { name: "title", label: "Page title" }, { name: "lead", label: "Intro line", type: "textarea" }, HERO,
      { type: "section", label: "Benefits" },
      points("perks", "Benefits", "Add benefit"),
      { type: "section", label: "Join box" },
      { name: "cardKicker", label: "Small heading" }, { name: "cardTitle", label: "Title" }, { name: "cardText", label: "Text" },
    ],
  },
  {
    key: "contactPage", group: "Pages", title: "Contact page", icon: "mail", url: "/contact/",
    desc: "Headings on the contact page. Numbers and email are in Website details.",
    fields: [
      { name: "title", label: "Page title" }, { name: "lead", label: "Intro line", type: "textarea" },
      { name: "enquiriesLabel", label: "Label for the event enquiries number" }, { name: "formTitle", label: "Message form title" }, HERO,
    ],
  },
  { key: "privacy", group: "Pages", title: "Privacy policy", icon: "shield", url: "/privacy/", desc: "The privacy policy text.", fields: legal },
  { key: "terms", group: "Pages", title: "Terms & conditions", icon: "file", url: "/terms/", desc: "Website and entry pass terms. {EVENT_TERMS} inserts the standard entry pass terms.", fields: legal },

  // ---------- Content ----------
  {
    key: "artists", group: "Content", title: "Artists", icon: "mic", url: "/artists/",
    desc: "Add, edit or reorder artists and their photos.",
    fields: [
      { name: "items", label: "Artists", type: "list", add: "Add artist", title: "name", item: [
        { name: "photo", label: "Photo", type: "image" },
        { name: "name", label: "Name" }, { name: "role", label: "Role", placeholder: "e.g. Vocalist · Sri Lanka" },
        { name: "group", label: "Shown under", type: "select", options: [["guest", "Guest artists"], ["team", "SURRAA artists"]] },
        { name: "slug", label: "Short code", hint: "Used in event line-ups. Filled in automatically from the name.", small: true },
      ] },
      { type: "section", label: "Artists page headings" },
      { name: "guestKicker", label: "Guest artists — small heading" }, { name: "guestTitle", label: "Guest artists — title" },
      { name: "teamKicker", label: "SURRAA artists — small heading" }, { name: "teamTitle", label: "SURRAA artists — title" },
      { name: "pageTitle", label: "Page title" }, HERO,
    ],
  },
  {
    key: "gallery", group: "Content", title: "Gallery", icon: "image", url: "/gallery/",
    desc: "Photos on the gallery page.",
    fields: [
      { name: "title", label: "Page title" }, HERO,
      { name: "items", label: "Photos", type: "list", add: "Add photo", grid: true, item: [
        { name: "src", label: "Photo", type: "image" },
        { name: "alt", label: "Caption" },
      ] },
    ],
  },

  {
    key: "events", group: "Content", title: "Event posters & photos", icon: "cal", url: "/events/", db: true,
    desc: "The poster and photos of every event. Dates, venue and line-up are edited in the bookings admin.",
    fields: [
      { name: "items", label: "Events", type: "list", fixed: true, title: "name", item: [
        { name: "id", type: "hidden" }, { name: "name", type: "hidden" },
        { name: "poster", label: "Event poster", type: "image", hint: "Shown on the home page, events list, event page and entry passes." },
        { name: "gallery", label: "Event photos", type: "images", hint: "Shown on the event page." },
      ] },
    ],
  },
  {
    key: "eventsPage", group: "Pages", title: "Events page", icon: "cal", url: "/events/",
    desc: "Title and header photo of the upcoming events list.",
    fields: [{ name: "title", label: "Page title" }, { name: "lead", label: "Intro line", type: "textarea" }, HERO],
  },

  // ---------- Settings ----------
  {
    key: "branding", group: "Settings", title: "Logo", icon: "star", url: "/",
    desc: "The SURRAA logo in the menu bar, footer, entry passes and account pages.",
    fields: [
      { name: "logo", label: "Main logo", type: "image", hint: "Best as a PNG with a transparent background." },
      { name: "footerLogo", label: "Footer logo", type: "image", hint: "Optional — leave empty to use the main logo." },
    ],
  },
  {
    key: "details", group: "Settings", title: "Website details & contacts", icon: "gear", url: "/contact/",
    desc: "Name, tagline, phone numbers, email and social links — used all over the site.",
    fields: [
      { type: "section", label: "Association" },
      { name: "name", label: "Full name" }, { name: "short", label: "Short name" }, { name: "location", label: "Country / city" },
      { name: "tagline", label: "Tagline", type: "textarea", hint: "Shown in the banner, About page and footer." },
      { type: "section", label: "Contact" },
      { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Main phone", type: "tel" },
      { name: "passesPhone", label: "Event enquiries phone", type: "tel" },
      { name: "website", label: "Website address", type: "url" },
      { type: "section", label: "Social media", hint: "Leave empty to hide an icon." },
      { name: "youtube", label: "YouTube", type: "url" }, { name: "tiktok", label: "TikTok", type: "url" },
      { name: "instagram", label: "Instagram", type: "url" }, { name: "facebook", label: "Facebook", type: "url" },
      { type: "section", label: "Membership & forms" },
      { name: "whatsapp", label: "WhatsApp for registrations", hint: "Digits only, with 965 — e.g. 96566247474" },
      { name: "fee", label: "Membership fee", placeholder: "e.g. KD 5 — leave empty to hide" }, { name: "period", label: "Fee period", placeholder: "e.g. per year" },
      { name: "welcome", label: "Welcome gift text" },
      { name: "nationalities", label: "Nationality suggestions", type: "lines", hint: "One per line." },
      { name: "areas", label: "Area suggestions", type: "lines", hint: "One per line." },
      { name: "formEndpoint", label: "Form email service (optional)", type: "url", hint: "A Formspree link to receive messages by email." },
    ],
  },
  {
    key: "seo", group: "Settings", title: "Search & sharing", icon: "search", url: "/",
    desc: "How the site appears on Google and when shared on WhatsApp.",
    fields: [
      { name: "siteTitle", label: "Website title" }, { name: "description", label: "Description", type: "textarea" },
      { name: "shareImage", label: "Share image", type: "image", hint: "Shown when a link is shared on WhatsApp or social media." },
    ],
  },
];

export const section = (k) => SECTIONS.find((s) => s.key === k);
export const GROUPS = ["Pages", "Content", "Settings"];
