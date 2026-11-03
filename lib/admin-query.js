// Shared booking search/filter used by the admin table and the exports, so exports always match the screen.
import { db } from "./db";

export const FILTER_KEYS = ["q", "event", "status", "payment", "type", "nationality", "qty", "from", "to", "event_from", "event_to", "checked", "sort"];

export function bookingQuery(params, { limit, offset } = {}) {
  const w = [], a = [];
  const p = (k) => String(params[k] ?? "").trim();
  if (p("q")) {
    const like = "%" + p("q") + "%";
    w.push(`(b.ref LIKE ? OR b.name LIKE ? OR b.mobile LIKE ? OR b.email LIKE ? OR e.name LIKE ? OR e.event_code LIKE ? OR u.membership_id LIKE ?
      OR EXISTS (SELECT 1 FROM passes x WHERE x.booking_id = b.id AND x.serial LIKE ?))`);
    a.push(like, like, like, like, like, like, like, like);
  }
  if (p("event")) { w.push("b.event_id = ?"); a.push(Number(p("event"))); }
  if (p("status") === "open_requests") w.push("b.status IN ('pending','under_review','contacted','awaiting')");
  else if (p("status") === "closed") w.push("b.status IN ('rejected','cancelled','expired')");
  else if (p("status") === "confirmed_any") w.push("b.status IN ('confirmed','checked_in')");
  else if (p("status")) { w.push("b.status = ?"); a.push(p("status")); }
  if (p("payment")) { w.push("COALESCE(pay.status,'unpaid') = ?"); a.push(p("payment")); }
  if (p("type")) { w.push("b.user_type = ?"); a.push(p("type")); }
  if (p("nationality")) { w.push("b.nationality LIKE ?"); a.push(p("nationality")); }
  if (p("qty")) { w.push("b.quantity = ?"); a.push(Number(p("qty"))); }
  // submission dates are stored in UTC; the filter dates are Kuwait days
  if (p("from")) { w.push("b.created_at >= ?"); a.push(new Date(p("from") + "T00:00:00+03:00").toISOString()); }
  if (p("to")) { w.push("b.created_at < ?"); a.push(new Date(new Date(p("to") + "T00:00:00+03:00").getTime() + 864e5).toISOString()); }
  if (p("event_from")) { w.push("e.date >= ?"); a.push(p("event_from")); }
  if (p("event_to")) { w.push("e.date <= ?"); a.push(p("event_to")); }
  if (p("checked") === "yes") w.push("EXISTS (SELECT 1 FROM passes x WHERE x.booking_id = b.id AND x.checked_in_at IS NOT NULL)");
  if (p("checked") === "no") w.push("b.status IN ('confirmed','checked_in') AND NOT EXISTS (SELECT 1 FROM passes x WHERE x.booking_id = b.id AND x.checked_in_at IS NOT NULL)");
  const SORTS = { new: "b.id DESC", old: "b.id ASC", name: "b.name COLLATE NOCASE", event: "e.date, b.id", qty: "b.quantity DESC, b.id DESC", status: "b.status, b.id DESC" };
  const from = `FROM bookings b JOIN events e ON e.id = b.event_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN users cu ON cu.id = b.confirmed_by
    LEFT JOIN payments pay ON pay.booking_id = b.id ${w.length ? "WHERE " + w.join(" AND ") : ""}`;
  const total = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(b.quantity),0) passes ${from}`).get(...a);
  const rows = db.prepare(`SELECT b.*, e.name event_name, e.event_code, e.date event_date, u.membership_id, cu.name confirmed_by_name,
      COALESCE(pay.status,'unpaid') pay_status, COALESCE(pay.total,0) pay_total, COALESCE(pay.received,0) pay_received, pay.method pay_method,
      (SELECT COUNT(*) FROM passes x WHERE x.booking_id = b.id AND x.checked_in_at IS NOT NULL) checked
    ${from} ORDER BY ${SORTS[p("sort")] || SORTS.new} ${limit ? `LIMIT ${Number(limit)} OFFSET ${Number(offset) || 0}` : ""}`).all(...a);
  return { rows, total: total.n, passes: total.passes };
}

export const PAYMENT_STATUS = { unpaid: "Unpaid", partial: "Partially paid", paid: "Paid", waived: "Waived", refunded: "Refunded" };
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Payment Link", "Other"];
