import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InternFlow",
    short_name: "InternFlow",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }]
  };
}
