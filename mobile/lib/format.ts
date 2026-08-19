// US-format display helpers, mirrored from lib/format.ts in the web repo.
// House rule: storage stays ISO (yyyy-mm-dd, RFC timestamps), but everything a
// person SEES uses US formats: phones as +1 (949) 201-9160, dates as MM-DD-YYYY.
// This file has no imports on either side, so the two copies stay trivially equal.


// Full-treatment formatting for US numbers (10 digits, or 11 with a
// leading 1). Anything else (foreign codes, short fragments) is
// returned as typed, whitespace tidied, never mangled.
export function formatPhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (trimmed === "") return "";
  const digits = trimmed.replace(/\D/g, "");
  const isUs =
    (digits.length === 10 && !trimmed.startsWith("+")) ||
    (digits.length === 11 && digits.startsWith("1"));
  if (!isUs) return trimmed;
  const d = digits.slice(-10);
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// As-you-type version: snaps to the US mask the moment the number is
// complete, but leaves partial or foreign input alone so backspacing
// and country codes don't fight the caret.
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const isUs =
    (digits.length === 10 && !raw.trim().startsWith("+")) ||
    (digits.length === 11 && digits.startsWith("1"));
  return isUs ? formatPhone(raw) : raw;
}

// MM-DD-YYYY from an ISO date or timestamp. Non-ISO input passes through.
export function usDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[2]}-${m[3]}-${m[1]}`;
}
