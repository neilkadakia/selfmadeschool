import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <div aria-hidden="true" className="wm about-wm">
        SM
      </div>
      <p className="kicker kicker--acc kicker--hero">★ Attendance Report</p>
      <p className="error-num">
        404<span className="dot">.</span>
      </p>
      <h1 className="about-h1">This page skipped class.</h1>
      <p className="page-copy">
        Whatever you were looking for didn&apos;t show up today. The rest of the school is still in
        session — head back and pick up where you left off.
      </p>
      <div className="hero-ctas">
        <Link href="/" className="btn btn--solid">
          Back to Class →
        </Link>
        <Link href="/#syllabus" className="btn btn--outline">
          See the Syllabus
        </Link>
      </div>
    </section>
  );
}
