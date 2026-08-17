// The Faculty Lounge shares the classroom shell (see components/lms/
// Classroom.tsx, which swaps its nav for the faculty rooms under this
// path). All this layer adds is the stylesheet for the rooms themselves.

import "@/app/faculty.css";

export const metadata = { title: "Faculty Lounge · Self Made School", robots: { index: false } };

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
