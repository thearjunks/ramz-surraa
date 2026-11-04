// Default wording for every editable page section. The CMS (/cms) saves changes to the
// database; anything not changed there falls back to the text below.
// Pure data — safe to import from client components.

export const PAGE_DEFAULTS = {
  home: {
    heroKicker: "Community Association · Kuwait",
    heroTitle: "*SURRAA*",
    heroButton2: "Become a member",
    attendKicker: "Entry passes",
    attendTitle: "How to *attend*",
    attendLead: "Request your entry pass online. Our team confirms every request personally, then your official pass with QR code is ready.",
    attendSteps: [
      { title: "Request", text: "Choose an event and request your entry passes — as a member or a guest." },
      { title: "Confirmation", text: "Our team reviews your request and contacts you on your mobile." },
      { title: "Your pass", text: "Download your official entry pass with QR code and show it at the entrance." },
    ],
    trackSmall: "Already requested?",
    trackTitle: "Track your entry pass",
    memberKicker: "Membership",
    memberTitle: "Free *member account*",
    memberLead: "Create a free account to request entry passes faster — your details fill in automatically and all your passes stay in one place.",
    memberPoints: [
      { icon: "ticket", title: "Faster requests", text: "Your details are filled in for you." },
      { icon: "star", title: "Digital membership ID", text: "Your personal SURRAA member number." },
      { icon: "cal", title: "Pass history", text: "Upcoming and past entry passes in one place." },
    ],
    artistsKicker: "On stage",
    artistsTitle: "Our artists",
    artistsCount: "4",
  },
  about: {
    title: "About *SURRAA*",
    lead: "",
    kicker: "Who we are",
    heading: "Music that brings *people together*",
    intro: "SURRAA Community Association connects our community in Kuwait through live music, local and international artists, and shared experiences.",
    body: "Our first concert, SUNDOWN – Chapter 1, brings artists from Sri Lanka together with Kuwait-based performers.",
    photo1: "images/g-ambika-mono.jpg",
    photo2: "images/g-ramz-live.jpg",
  },
  artistsPage: {
    title: "Our *artists*",
    guestKicker: "SUNDOWN – Chapter 1",
    guestTitle: "From Sri Lanka",
    teamKicker: "Kuwait",
    teamTitle: "SURRAA artists",
  },
  galleryPage: { title: "*Gallery*", lead: "" },
  membershipPage: {
    title: "Become a *member*",
    lead: "Free to join. Membership does not confirm an entry pass by itself — every pass is still confirmed by our team.",
    perks: [
      { icon: "ticket", title: "Faster entry pass requests", text: "Your name, mobile, nationality and Civil ID are filled in automatically." },
      { icon: "star", title: "Digital membership ID", text: "Your personal SURRAA member number in your account." },
      { icon: "cal", title: "Upcoming & past events", text: "All your requests, confirmations and passes in one place." },
      { icon: "search", title: "Pass tracking", text: "Follow every request from submitted to confirmed." },
      { icon: "users", title: "Member invitations", text: "Access to member-only events when we announce them." },
    ],
    cardKicker: "Free account",
    cardTitle: "Join in a minute",
    cardText: "Name, mobile, email and a password — that's all.",
  },
  contactPage: {
    title: "Contact *us*",
    lead: "",
    enquiriesLabel: "SUNDOWN enquiries",
    formTitle: "Send a message",
  },
  privacy: {
    title: "Privacy policy",
    lead: "How we handle the information you share with us.",
    sections: [
      { heading: "Information we collect", text: "When you create an account, request an entry pass or contact us, we collect the details you provide: name, mobile / WhatsApp number, email, nationality and — for entry pass requests — your Kuwait Civil ID number. We also record the date and time of your request and the page it was made from." },
      { heading: "How we use it", text: "We use your information to manage your account and entry pass requests, verify identity at the entrance, contact you about your requests and events, and respond to your messages. We do not sell your personal information." },
      { heading: "Civil ID", text: "Your Civil ID number is stored encrypted, is visible only to authorised staff, and never appears on entry passes, QR codes or links. It is used only to verify entry pass requests and prevent duplicates." },
      { heading: "Third-party services", text: "This website uses Google Fonts, Google Maps. These services may collect technical data according to their own privacy policies." },
      { heading: "Retention & your rights", text: "We keep request data only as long as needed for the event and legitimate records, and delete Civil ID numbers when they are no longer required. You can ask us to access, correct or delete your information, or unsubscribe at any time, by emailing info@surraa.com." },
      { heading: "Contact", text: "SURRAA Community Association, Kuwait — info@surraa.com" },
    ],
  },
  terms: {
    title: "Terms & conditions",
    lead: "",
    sections: [
      { heading: "Entry passes", text: "{EVENT_TERMS}\n\nSubmitting a request does not guarantee admission. Requests are confirmed by SURRAA Community Association at its discretion and may be declined, cancelled or expire. Each event may have additional terms shown on its page." },
      { heading: "Your account", text: "Keep your password private. You are responsible for requests made from your account. We may suspend accounts that misuse the service." },
      { heading: "Event information", text: "Line-ups, times and venues may change. The latest information is published on this website." },
      { heading: "Contact", text: "info@surraa.com" },
    ],
  },
  eventsPage: { title: "Upcoming *events*", lead: "", heroImage: "" },
  branding: { logo: "images/surraa-logo.png", footerLogo: "" },
  seo: {
    siteTitle: "SURRAA Community Association | Kuwait",
    description: "SURRAA Community Association, Kuwait — live music and community events. Request your entry pass online.",
    shareImage: "images/poster-en.jpg",
  },
};
