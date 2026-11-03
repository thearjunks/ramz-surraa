// Names are collected for each requested pass and kept with the booking until issue.
export function readPassHolders(fd, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return null;
  const holders = [];
  for (let i = 1; i <= quantity; i++) {
    const first = String(fd.get(`holder_first_${i}`) ?? "").trim();
    const last = String(fd.get(`holder_last_${i}`) ?? "").trim();
    if (!first || !last || first.length > 80 || last.length > 80 || /[\r\n<>]/.test(first + last)) return null;
    holders.push({ first, last });
  }
  return holders;
}

export function holdersForBooking(booking) {
  try {
    const names = JSON.parse(booking.pass_holders_json || "[]");
    if (Array.isArray(names) && names.length === booking.quantity && names.every((n) => n?.first && n?.last)) return names;
  } catch { /* Older bookings use the contact name. */ }
  return Array.from({ length: booking.quantity }, () => ({ first: booking.name, last: "" }));
}

export const holderName = (holder) => [holder.first, holder.last].filter(Boolean).join(" ");
