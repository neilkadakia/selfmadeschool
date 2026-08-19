// Build-time export of the full curriculum for the API to serve.
//
// Why this exists: the website is a static export, so lesson text ships inside
// the JavaScript bundle no matter what course_access() decides. That is fine
// for a school that is free and open, and useless the day one of these courses
// is sold. The phone app has the same problem from the other direction: it
// cannot import a .ts file off a web build.
//
// So the curriculum gets written out here, once per build, into a file the web
// server denies (api/.htaccess blocks *.json) and only api/content.php will
// hand out, one course or one unit at a time, after course_access() has said
// yes. That single endpoint is what makes a paid course actually enforceable
// and what feeds the app.
//
// Unit knowledge-check answers ARE included: they give instant feedback and
// the browser has always had them. The FINAL is a different matter and stays
// in final-keys.json, graded server-side, so the record behind a certificate
// is one the school asserts rather than one the client reports.

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COURSES, courseUnits } from "../lib/lms";

const out = {
  generated: new Date().toISOString(),
  courses: COURSES.map((course) => ({
    slug: course.slug,
    title: course.title,
    kicker: course.kicker,
    tone: course.tone,
    status: course.status,
    headline: course.headline,
    description: course.description,
    parts: course.parts.map((part) => ({
      id: part.id,
      name: part.name,
      tone: part.tone,
      tagline: part.tagline,
      action: part.action,
      units: part.units.map((u) => ({
        slug: u.slug,
        title: u.title,
        blurb: u.blurb,
        live: u.live,
        // Whether a lesson has actually been written yet. The app needs to
        // know without downloading the body to find out.
        taught: Boolean(course.lessons[u.slug]),
      })),
    })),
    // Flat order, so a client can say "next unit" without walking the parts.
    order: courseUnits(course).map((u) => u.slug),
    lessons: course.lessons,
  })),
};

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "api", "content.json");
writeFileSync(target, JSON.stringify(out), "utf8");

const units = out.courses.reduce((n, c) => n + Object.keys(c.lessons).length, 0);
const bytes = Buffer.byteLength(JSON.stringify(out), "utf8");
console.log(
  `content.json: ${out.courses.length} courses, ${units} written units, ${(bytes / 1024).toFixed(0)} KB`
);
