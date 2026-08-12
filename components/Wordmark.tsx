type Props = { gid: string };

export default function Wordmark({ gid }: Props) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
        padding: "0 0 6px",
      }}
    >
      SELF
      <span style={{ color: "var(--acc)", fontSize: "0.68em", verticalAlign: "0.1em" }}>-</span>
      MADE SCHOOL
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
          d="M6,15.5 C90,12 190,8.5 268,4.5 L268,11.5 C190,14.5 90,17 6,19 Z"
          fill={"url(#" + gid + ")"}
        />
        <path d="M264,0.5 L298,8 L265,15.5 Z" fill="#43DE7B" />
      </svg>
    </span>
  );
}
