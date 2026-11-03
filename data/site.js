/* =====================================================================
   SURRAA COMMUNITY ASSOCIATION — WEBSITE CONTENT FILE
   ---------------------------------------------------------------------
   Edit this one file to update the website. Open it in Notepad, change the
   text between the quotes and save — the page refreshes automatically.
   - Keep the quotes "..." and commas , exactly as they are.
   - Leave a value as "" (empty) to hide it on the website.
   - Images live in public/images and are written here as "images/name.jpg".
   ===================================================================== */
const site = {

  /* ---------- Association & contact ---------- */
  company: {
    name: "SURRAA Community Association",
    short: "SURRAA",
    location: "Kuwait",
    tagline: "Bringing our community together through music and live entertainment in Kuwait.",
    email: "info@surraa.com",
    phone: "+965 50900898",
    passesPhone: "+965 51517484",        // shown for event enquiries
    website: "https://www.surraa.com",
    youtube: "https://www.youtube.com/@surraa",
    tiktok: "https://www.tiktok.com/@surraa_productions",
    instagram: "", facebook: "",
    /* Optional: a Formspree link (https://formspree.io/f/xxxx) to receive every
       membership registration and contact message by email automatically. */
    formEndpoint: ""
  },

  /* ---------- Home banner (animated carousel) ----------
     Photos fade one into the next every few seconds. Add, remove or reorder freely.
     src: image in public/images (free Unsplash photos in images/hero) · pos: which part stays in view ("center 30%", "left top"…) · caption: small label */
  hero: {
    slides: [
      { src: "images/hero/concert-stage-lights.jpg", pos: "center 40%", caption: "Live concerts" },
      { src: "images/hero/laser-crowd.jpg", pos: "center 45%", caption: "Lights. Music. You." },
      { src: "images/hero/dj-decks.jpg", pos: "center 62%", caption: "DJ nights" },
      { src: "images/hero/hands-up.jpg", pos: "center 40%", caption: "Feel the moment" },
      { src: "images/hero/concert-hall.jpg", pos: "center 55%", caption: "Community events" },
      { src: "images/hero/festival-stage.jpg", pos: "center 50%", caption: "Big stage energy" }
    ]
  },

  /* ---------- Membership ---------- */
  membership: {
    fee: "",                              // e.g. "KD 5" — leave "" until confirmed (then the site says "shared on WhatsApp")
    period: "",                           // e.g. "per year"
    welcome: "Free entry to SUNDOWN – Chapter 1",
    /* WhatsApp number (digits only, with 965) that receives new registrations */
    whatsapp: "96566247474",
    paymentNote: "After you register, our team will contact you on WhatsApp with the membership fee and payment details.",
    /* Shown as suggestions in the form — visitors can still type their own */
    nationalities: ["Sri Lankan", "Indian", "Kuwaiti", "Pakistani", "Bangladeshi", "Nepali", "Filipino", "Egyptian"],
    areas: ["Abbasiya", "Abu Halifa", "Ahmadi", "Fahaheel", "Farwaniya", "Fintas", "Hawally", "Jabriya", "Jahra", "Jleeb Al-Shuyoukh",
      "Khaitan", "Kuwait City", "Mahboula", "Mangaf", "Riggae", "Sabah Al-Salem", "Salmiya", "Shuwaikh"]
  },

  /* ---------- Events ---------- */
  events: [
    {
      slug: "sundown-chapter-1",
      title: "SUNDOWN – Chapter 1",
      category: "Live Concert",
      start: "2026-11-20T18:00:00+03:00",   // gates open 6:00 PM Kuwait time
      end: "",
      dateLabel: "Friday, 20 November 2026",
      timeLabel: "Gates open 6:00 PM",
      venue: "The Convention Centre & Royal Suites Hotel",
      area: "Shuwaikh, Kuwait",
      mapQuery: "The Convention Centre & Royal Suites Hotel, Shuwaikh, Kuwait",
      poster: "images/poster-en.jpg",
      organiser: "SURRAA Community Association",
      short: "A night of live music with artists from Sri Lanka and Kuwait — singers, DJs and stage visuals.",
      lineup: ["sandun-perera", "dilki-uresha", "dj-mj", "ramz-rmzn", "ambika-rajesh"],
      faqs: [
        { q: "How do I attend?", a: "Become a SURRAA member — members attend SUNDOWN – Chapter 1 free as our welcome. Register on the Membership page." },
        { q: "When and where?", a: "Friday, 20 November 2026 at The Convention Centre & Royal Suites Hotel, Shuwaikh. Gates open at 6:00 PM." },
        { q: "Who is performing?", a: "Sandun Perera and Dilki Uresha (from Sri Lanka), DJ MJ, RAMZ RMZN and Ambika Rajesh, with local talent." },
        { q: "Questions?", a: "Call +965 51517484 or email info@surraa.com." }
      ],
      gallery: ["images/g-dilki-stage.jpg", "images/g-ambika-stage.jpg", "images/g-ramz-live.jpg", "images/g-dj-mj.jpg"]
    }
  ],

  /* ---------- Artists ----------  group: "team" = SURRAA artists, "guest" = event guests */
  artists: [
    { slug: "ramz-rmzn", name: "RAMZ RMZN", group: "team", role: "Recording Artist · Producer", photo: "images/ramz.jpg" },
    { slug: "ambika-rajesh", name: "AMBIKA RAJESH", group: "team", role: "Singer", photo: "images/ambika.jpg" },
    { slug: "dj-raj-kuwait", name: "DJ RAJ KUWAIT", group: "team", role: "DJ", photo: "" },
    { slug: "mohamed-umar", name: "MOHAMED UMAR", group: "team", role: "Music Director · VJ", photo: "" },
    { slug: "mohamed-rifkhan", name: "RIFKHVN", group: "team", role: "Vocalist", photo: "" },
    { slug: "sandun-perera", name: "SANDUN PERERA", group: "guest", role: "Vocalist · Sri Lanka", photo: "images/sandun.jpg" },
    { slug: "dilki-uresha", name: "DILKI URESHA", group: "guest", role: "Vocalist · Sri Lanka", photo: "images/dilki.jpg" },
    { slug: "dj-mj", name: "DJ MJ", group: "guest", role: "DJ · Sri Lanka", photo: "images/dj-mj.jpg" }
  ],

  /* ---------- Gallery ---------- */
  gallery: [
    { src: "images/g-dilki-stage.jpg", alt: "Dilki Uresha performing on stage" },
    { src: "images/g-ambika-stage.jpg", alt: "Ambika Rajesh under stage lights" },
    { src: "images/g-ramz-live.jpg", alt: "RAMZ RMZN performing live" },
    { src: "images/sandun.jpg", alt: "Sandun Perera" },
    { src: "images/g-ambika-blue.jpg", alt: "Ambika Rajesh singing" },
    { src: "images/dj-mj.jpg", alt: "DJ MJ at the decks" },
    { src: "images/g-dilki-teal.jpg", alt: "Dilki Uresha" },
    { src: "images/ramz.jpg", alt: "RAMZ RMZN on the mic" },
    { src: "images/g-ambika-mono.jpg", alt: "Ambika Rajesh in concert" },
    { src: "images/g-dj-mj.jpg", alt: "DJ MJ" },
    { src: "images/poster-en.jpg", alt: "SUNDOWN – Chapter 1 poster" },
    { src: "images/g-dilki-black.jpg", alt: "Dilki Uresha portrait" }
  ]
};

export default site;
