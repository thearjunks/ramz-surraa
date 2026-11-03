// Report definitions → { title, columns, rows }. Formats are rendered in app/admin/export/route.js.
import { db, audit } from "./db";
import { can } from "./auth";
import { bookingQuery, PAYMENT_STATUS } from "./admin-query";
import { STATUS, fmtDT, fmtDate, eventStart, eventStats, EVENT_STATUS, eventState } from "./bookings";
import { decrypt, maskCivil } from "./security";

export const REPORTS = {
  bookings: "All booking requests",
  event: "Event-wise booking report",
  pending: "Pending confirmation report",
  confirmed: "Confirmed entry pass report",
  cancelled: "Cancelled / rejected booking report",
  members: "Membership report",
  guests: "Guest user report",
  capacity: "Event capacity report",
  payments: "Payment collection report",
  attendance: "Event attendance report",
  period: "Daily / weekly / monthly booking report",
};

export function buildReport(user, params) {
  const r = params.report || "bookings";
  const finance = can(user, "reports.finance") || can(user, "payments");
  const sensitive = params.sensitive === "1" && can(user, "reports.sensitive");
  const civil = (b) => (sensitive ? decrypt(b.civil_enc) : maskCivil(b.civil_last4));
  if (sensitive) audit(user.id, "export.sensitive", "report", r, "Export with full Civil ID numbers");

  const bookingCols = ["Booking Reference", "Event ID", "Event Name", "Event Date", "User Type", "Membership ID", "Customer Name", "Mobile", "Email", "Nationality", "Civil ID",
    "Passes", "Booking Status", ...(finance ? ["Payment Status", "Internal Total (KD)", "Received (KD)"] : []), "Submitted (Kuwait)", "Source Page", "Confirmed", "Confirmed By", "Checked-in Passes"];
  const bookingRow = (b) => [b.ref, b.event_code, b.event_name, b.event_date, b.user_type, b.membership_id || "", b.name, b.mobile, b.email, b.nationality, civil(b),
    b.quantity, STATUS[b.status], ...(finance ? [PAYMENT_STATUS[b.pay_status], b.pay_total, b.pay_received] : []), fmtDT(b.created_at), b.page_url, fmtDT(b.confirmed_at), b.confirmed_by_name || "", b.checked];
  const bookings = (extra) => { const q = bookingQuery({ ...params, ...extra }); return q.rows.map(bookingRow); };

  switch (r) {
    case "bookings": case "event": return { title: REPORTS[r], columns: bookingCols, rows: bookings({}) };
    case "pending": return { title: REPORTS[r], columns: bookingCols, rows: bookings({ status: "open_requests" }) };
    case "cancelled": return { title: REPORTS[r], columns: bookingCols, rows: bookings({ status: "closed" }) };
    case "confirmed": {
      const ids = bookingQuery({ ...params, status: "confirmed_any" }).rows;
      const rows = [];
      for (const b of ids) for (const p of db.prepare("SELECT * FROM passes WHERE booking_id = ? ORDER BY serial").all(b.id))
        rows.push([p.serial, b.ref, b.event_code, b.event_name, b.event_date, p.holder, b.mobile, b.email, p.status, fmtDT(p.issued_at), p.checked_in_at ? fmtDT(p.checked_in_at) : ""]);
      return { title: REPORTS[r], columns: ["Pass Serial", "Booking Reference", "Event ID", "Event", "Event Date", "Pass Holder", "Mobile", "Email", "Pass Status", "Issued", "Checked In"], rows };
    }
    case "members": {
      const rows = db.prepare(`SELECT u.*, c.name cat, (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) req,
        (SELECT COUNT(*) FROM passes p JOIN bookings b ON b.id = p.booking_id WHERE b.user_id = u.id AND p.status='valid') passes FROM users u
        LEFT JOIN membership_categories c ON c.id = u.category_id WHERE u.role = 'member' ORDER BY u.id`).all();
      return { title: REPORTS[r], columns: ["Membership ID", "Name", "Mobile", "Email", "Nationality", "Civil ID", "Category", "Membership Status", "Account Status", "Email Verified", "Registered", "Last Login", "Requests", "Confirmed Passes"],
        rows: rows.map((u) => [u.membership_id, u.name, u.mobile, u.email, u.nationality, u.civil_enc ? (sensitive ? decrypt(u.civil_enc) : maskCivil(u.civil_last4)) : "", u.cat || "",
          u.membership_status, u.account_status, u.email_verified ? "Yes" : "No", fmtDT(u.created_at), fmtDT(u.last_login), u.req, u.passes]) };
    }
    case "guests": {
      const rows = db.prepare(`SELECT email, MAX(name) name, MAX(mobile) mobile, MAX(nationality) nationality, COUNT(*) req, SUM(quantity) passes, MIN(created_at) first, MAX(created_at) last
        FROM bookings WHERE user_type = 'guest' GROUP BY email ORDER BY last DESC`).all();
      return { title: REPORTS[r], columns: ["Name", "Mobile", "Email", "Nationality", "Requests", "Passes Requested", "First Request", "Last Request"],
        rows: rows.map((g) => [g.name, g.mobile, g.email, g.nationality, g.req, g.passes, fmtDT(g.first), fmtDT(g.last)]) };
    }
    case "capacity": {
      const ev = db.prepare("SELECT * FROM events" + (params.event ? " WHERE id = ?" : "") + " ORDER BY date").all(...(params.event ? [Number(params.event)] : []));
      return { title: REPORTS[r], columns: ["Event ID", "Event", "Date", "Status", "Capacity", "Reserved", "Requested (active)", "Pending", "Confirmed", "Available", "Checked In", "Utilisation %"],
        rows: ev.map((e) => { const s = eventStats(e.id); return [e.event_code, e.name, fmtDate(eventStart(e)), EVENT_STATUS[eventState(e, s).key], e.capacity, e.reserved, s.used, s.pending, s.confirmed, s.available, s.checkedIn,
          e.capacity ? Math.round((s.used / Math.max(1, e.capacity - e.reserved)) * 100) : 0]; }) };
    }
    case "payments": {
      if (!finance) return { title: REPORTS[r], columns: ["Notice"], rows: [["Not permitted"]] };
      const q = bookingQuery(params).rows.filter((b) => !["rejected", "cancelled", "expired"].includes(b.status));
      const pays = Object.fromEntries(db.prepare("SELECT * FROM payments").all().map((p) => [p.booking_id, p]));
      return { title: REPORTS[r], columns: ["Booking Reference", "Event ID", "Customer", "Mobile", "Passes", "Rate (KD)", "Total (KD)", "Received (KD)", "Outstanding (KD)", "Payment Status", "Method", "Payment Date", "Reference", "Remarks", "Booking Status"],
        rows: q.map((b) => { const p = pays[b.id] || {}; return [b.ref, b.event_code, b.name, b.mobile, b.quantity, p.rate || 0, p.total || 0, p.received || 0, Math.max(0, (p.total || 0) - (p.received || 0)),
          PAYMENT_STATUS[p.status || "unpaid"], p.method || "", p.payment_date || "", p.reference || "", p.remarks || "", STATUS[b.status]]; }) };
    }
    case "attendance": {
      const rows = db.prepare(`SELECT p.*, b.ref, e.event_code, e.name ev, u.name by_name FROM passes p JOIN bookings b ON b.id = p.booking_id JOIN events e ON e.id = p.event_id
        LEFT JOIN users u ON u.id = p.checked_in_by WHERE p.status = 'valid' ${params.event ? "AND p.event_id = ?" : ""} ORDER BY e.date, p.serial`).all(...(params.event ? [Number(params.event)] : []));
      return { title: REPORTS[r], columns: ["Event ID", "Event", "Pass Serial", "Booking Reference", "Pass Holder", "Checked In", "Check-in Time", "Verified By"],
        rows: rows.map((p) => [p.event_code, p.ev, p.serial, p.ref, p.holder, p.checked_in_at ? "Yes" : "No", fmtDT(p.checked_in_at), p.by_name || ""]) };
    }
    case "period": {
      const fmt = { daily: "%Y-%m-%d", weekly: "%Y-W%W", monthly: "%Y-%m" }[params.period] || "%Y-%m-%d";
      const q = bookingQuery(params).rows;
      const groups = {};
      for (const b of q) {
        const d = new Date(new Date(b.created_at).getTime() + 3 * 3600e3);
        const key = fmt === "%Y-%m" ? d.toISOString().slice(0, 7) : fmt === "%Y-W%W" ? weekKey(d) : d.toISOString().slice(0, 10);
        const g = (groups[key] ||= { req: 0, passes: 0, confirmed: 0, pending: 0, closed: 0 });
        g.req++; g.passes += b.quantity;
        if (["confirmed", "checked_in"].includes(b.status)) g.confirmed++; else if (["rejected", "cancelled", "expired"].includes(b.status)) g.closed++; else g.pending++;
      }
      return { title: REPORTS[r] + ` (${params.period || "daily"})`, columns: ["Period", "Requests", "Passes Requested", "Confirmed", "Pending", "Cancelled/Rejected/Expired"],
        rows: Object.keys(groups).sort().map((k) => [k, groups[k].req, groups[k].passes, groups[k].confirmed, groups[k].pending, groups[k].closed]) };
    }
    default: return { title: "Unknown report", columns: [], rows: [] };
  }
}

function weekKey(d) { // ISO week, e.g. 2026-W47
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + "-W" + String(Math.ceil(((t - y) / 864e5 + 1) / 7)).padStart(2, "0");
}
