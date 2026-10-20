import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Indulgent Spoon",
    short_name: "Indulgent Spoon",
    description:
      "Discover delicious cakes, desserts and bakery treats from The Indulgent Spoon. Explore our menu and order online for delivery across our service areas in Delhi NCR.",
    start_url: "/",
    display: "standalone",
    background_color: "#D9BC9E",
    theme_color: "#7A774D",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
