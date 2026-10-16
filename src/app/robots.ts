import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/vasviadminspoon/",
          "/admin/",
          "/api/",
          "/checkout",
          "/order-success",
        ],
      },
    ],
    sitemap: "https://theindulgentspoon.in/sitemap.xml",
  };
}
