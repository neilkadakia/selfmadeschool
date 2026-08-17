"use client";

// The Studio in its own room. The writing itself has not changed: this is
// the existing Copilot drafting surface, given the space it always wanted
// and the same header as every other room in the lounge.

import Studio from "@/components/lms/Studio";
import { Room, useFlash } from "./ui";

export default function StudioRoom() {
  const { flash, node } = useFlash();
  return (
    <Room
      kicker="Faculty Lounge"
      title="The Studio"
      sub="Draft a unit with the Copilot, read it like an editor, and export it as TypeScript for the course files. Nothing reaches students until it ships in a build."
    >
      <Studio flash={flash} />
      {node}
    </Room>
  );
}
