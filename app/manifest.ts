import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academy for Extraordinary Witches",
    short_name: "Academy",
    description: "Private society portal.",
    start_url: "/",
    display: "standalone",
    background_color: "#191E24",
    theme_color: "#191E24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
