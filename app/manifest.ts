import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hisab — হিসাব",
    short_name: "Hisab",
    description: "Personal finance, expense tracking and dhar-dena ledger for Bangladesh.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#166534",
    lang: "en",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "খরচ যোগ · Add expense", url: "/transactions/new?type=EXPENSE" },
      { name: "খাতা · Ledger", url: "/ledger" },
    ],
  };
}
