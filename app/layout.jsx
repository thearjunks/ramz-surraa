import "./globals.css";
import "@/lib/content"; // serve live CMS content
import { C, page } from "@/lib/site";

export function generateMetadata() {
  const s = page("seo");
  let base; try { base = new URL(C.website || "https://www.surraa.com"); } catch { base = new URL("https://www.surraa.com"); }
  return {
    metadataBase: base,
    title: { default: s.siteTitle, template: "%s" },
    description: s.description,
    openGraph: { type: "website", siteName: C.name, images: s.shareImage ? ["/" + s.shareImage.replace(/^\//, "")] : [] },
    twitter: { card: "summary_large_image" },
  };
}
export const viewport = { themeColor: "#080A08", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
