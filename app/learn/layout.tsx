import LmsTheme from "@/components/lms/LmsTheme";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LmsTheme />
      {children}
    </>
  );
}
