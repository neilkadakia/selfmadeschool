// Calendar files, written in the browser.
//
// An .ics could come from PHP, but a plain <a href> cannot carry the auth
// header, and the student already holds everything the file needs: the API
// only ever sent them a join link if they hold a seat. So the file is built
// from what is on screen, which also means it works with the server asleep.

import type { Session } from "./api";

// RFC 5545 wants UTC stamps with no punctuation: 20260817T190000Z.
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escape the characters that would otherwise end a field or a line.
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines over 75 octets have to fold, and a reader that gets an unfolded long
// description shows the tail as a broken field rather than text.
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

export function sessionIcs(s: Session): string {
  const start = new Date(s.startsAt);
  const end = new Date(start.getTime() + (s.durationMin || 60) * 60000);
  const description = [s.blurb, s.link ? `Join: ${s.link}` : ""].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Self Made School//Office Hours//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${s.id}@selfmadeschool.org`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(s.startsAt)}`,
    `DTEND:${stamp(end.toISOString())}`,
    `SUMMARY:${esc(s.title)}`,
    description ? `DESCRIPTION:${esc(description)}` : "",
    s.link ? `URL:${esc(s.link)}` : "",
    s.host ? `ORGANIZER;CN=${esc(s.host)}:mailto:noreply@selfmadeschool.org` : "",
    // A reminder in the calendar as well as one in the inbox.
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(s.title)} starts in 30 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map(fold).join("\r\n") + "\r\n";
}

// Hand the file to the browser. Revoking on the next tick keeps Safari happy,
// which reads the blob after the click rather than during it.
export function downloadIcs(s: Session) {
  const blob = new Blob([sessionIcs(s)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "office-hours"}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Deep links for the two calendars most people actually use. The .ics covers
// Apple Calendar and Outlook desktop; these two want a URL instead.
const GAP = "\n\n";

function endOf(s: Session): Date {
  return new Date(new Date(s.startsAt).getTime() + (s.durationMin || 60) * 60000);
}

function describe(s: Session): string {
  return [s.blurb, s.link ? `Join: ${s.link}` : ""].filter(Boolean).join(GAP);
}

export function googleCalendarUrl(s: Session): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: s.title,
    dates: `${stamp(s.startsAt)}/${stamp(endOf(s).toISOString())}`,
    details: describe(s),
  });
  if (s.link) q.set("location", s.link);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function outlookCalendarUrl(s: Session): string {
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: s.title,
    startdt: new Date(s.startsAt).toISOString(),
    enddt: endOf(s).toISOString(),
    body: describe(s),
  });
  if (s.link) q.set("location", s.link);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}
