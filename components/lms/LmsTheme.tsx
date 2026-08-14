"use client";

// Applies the account's LMS theme (dark ink / light paper) while any
// /learn page is mounted. The marketing site keeps its own look.

import { useEffect } from "react";
import { useLms } from "@/components/useLms";

export default function LmsTheme() {
  const { state } = useLms();

  useEffect(() => {
    document.documentElement.classList.toggle("lms-light", state.theme === "light");
    return () => document.documentElement.classList.remove("lms-light");
  }, [state.theme]);

  return null;
}
