import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AETHR — Personal Wellness Journal",
    short_name: "AETHR",
    description: "A personal nutrition, movement, and recovery journal.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0B0C11",
    theme_color: "#0B0C11",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
