"use client";

// v1 had 13th Grade units at /learn/<unit>/. Forward those URLs to the course player.

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <div className="learn">
      <div className="learn-wrap">
        <p className="learn-sub">
          This unit moved. <Link href={to}>Continue to the lesson →</Link>
        </p>
      </div>
    </div>
  );
}
