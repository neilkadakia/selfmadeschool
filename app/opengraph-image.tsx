import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Self Made School: School Never Taught You This";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Google Fonts CSS with a plain UA returns TTF urls, which satori can consume.
async function loadBricolage(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&display=swap",
      { headers: { "User-Agent": "curl/8" } }
    ).then((r) => r.text());
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const sweep = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 20"><defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F5A83C"/><stop offset="0.55" stop-color="#B8C94F"/><stop offset="1" stop-color="#43DE7B"/></linearGradient></defs><path d="M6,15 C90,4 230,4 294,11" stroke="url(#d)" stroke-width="5.5" fill="none" stroke-linecap="round"/></svg>'
)}`;

export default async function OpengraphImage() {
  const font = await loadBricolage();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0E0E12",
          color: "#F2EEE3",
          padding: "64px 72px",
          fontFamily: font ? "Bricolage" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.22em",
            color: "#43DE7B",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              background: "#43DE7B",
              borderRadius: 3,
              marginRight: 14,
              transform: "rotate(-8deg)",
            }}
          />
          CLASS IS IN SESSION
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 112,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
          }}
        >
          <span>SCHOOL NEVER</span>
          <span>TAUGHT YOU</span>
          <span style={{ display: "flex" }}>
            <span style={{ color: "#43DE7B" }}>THIS</span>
            <span style={{ color: "#FFB43A" }}>.</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            SELF
            <span style={{ color: "#43DE7B", fontSize: 24, margin: "0 3px" }}>-</span>
            MADE&nbsp;<span style={{ color: "#43DE7B" }}>SCHOOL</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sweep} width={420} height={28} alt="" style={{ marginTop: 4 }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Bricolage", data: font, weight: 800 as const, style: "normal" as const }]
        : undefined,
    }
  );
}
