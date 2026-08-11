import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `next build` emits a plain HTML/CSS/JS site into `out/`,
  // deployable to any static host (Hostinger shared hosting included).
  output: "export",
  // Static hosts serve directories, so /about -> /about/index.html.
  trailingSlash: true,
};

export default nextConfig;
