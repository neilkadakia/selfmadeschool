type Props = { gid: string };

export default function Wordmark({ gid }: Props) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
        letterSpacing: "-0.03em",
        padding: "0 0 6px",
      }}
    >
      SELF
      <span style={{ color: "var(--acc)", fontSize: "0.62em", verticalAlign: "0.1em" }}>-</span>
      MADE <span style={{ color: "var(--acc)" }}>SCHOOL</span>
      <svg
        width="100%"
        height="5"
        viewBox="0 0 300 20"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", left: 0, bottom: 0, overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F5A83C" />
            <stop offset="0.55" stopColor="#B8C94F" />
            <stop offset="1" stopColor="#43DE7B" />
          </linearGradient>
        </defs>
        <path
          d="M6,15 C90,4 230,4 294,11"
          stroke={"url(#" + gid + ")"}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
