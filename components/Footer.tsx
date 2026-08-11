import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer-logo">SELF MADE SCHOOL</span>
      <div className="footer-links">
        <Link href="/#syllabus">Syllabus</Link>
        <Link href="/#how">How It Works</Link>
        <Link href="/#book">The Book</Link>
        <Link href="/about">About</Link>
        <Link href="/#enroll">Enroll</Link>
      </div>
      <span>© 2026 Self Made School. Not actual financial advice — actual life advice.</span>
    </footer>
  );
}
