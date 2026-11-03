import D from "@/data/site";

export { D };
export const C = D.company || {};
export const M = D.membership || {};

// "images/x.jpg" -> "/images/x.jpg", "news/a/index.html" -> "/news/a/"; external links untouched
export const src = (p) => (!p || /^(https?:|mailto:|tel:|#|\/)/.test(p) ? p : "/" + p.replace(/(^|\/)index\.html(?=$|[?#])/, "$1"));
export const tel = (p) => "tel:" + String(p).replace(/[^\d+]/g, "");

export const artistBy = (s) => (D.artists || []).find((a) => a.slug === s);
export const eventBy = (s) => (D.events || []).find((e) => e.slug === s);
export const eventUrl = (e) => `/events/${e.slug}/`;

// ponytail: evaluated at build/request time; in a static export rebuild after an event ends to flip it to "Past"
export function status(e, now = Date.now()) {
  const s = new Date(e.start).getTime();
  const en = e.end ? new Date(e.end).getTime() : s + 6 * 3600e3;
  return now < s ? "Upcoming" : now <= en ? "Ongoing" : "Past";
}
export const upcoming = () => (D.events || []).filter((e) => status(e) !== "Past").sort((a, b) => a.start.localeCompare(b.start));

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export function kwDate(e) {
  const d = new Date(new Date(e.start).getTime() + 3 * 3600e3); // Kuwait is UTC+3, no DST
  return { d: d.getUTCDate(), m: MON[d.getUTCMonth()] };
}

const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export const eventEnd = (e) => e.end || new Date(new Date(e.start).getTime() + 5 * 3600e3).toISOString();
export const gcalUrl = (e) =>
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.title) +
  "&dates=" + stamp(e.start) + "/" + stamp(eventEnd(e)) +
  "&location=" + encodeURIComponent(e.venue + ", " + e.area) + "&details=" + encodeURIComponent(e.short);
export const ics = (e) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SURRAA Community Association//EN", "BEGIN:VEVENT", "UID:" + e.slug + "@surraa.com",
    "DTSTAMP:" + stamp(Date.now()), "DTSTART:" + stamp(e.start), "DTEND:" + stamp(eventEnd(e)), "SUMMARY:" + e.title,
    "LOCATION:" + (e.venue + ", " + e.area).replace(/,/g, "\\,"), "DESCRIPTION:" + e.short.replace(/,/g, "\\,"), "END:VEVENT", "END:VCALENDAR"].join("\r\n");

export function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200);
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
