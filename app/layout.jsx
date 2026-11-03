import "./globals.css";
import { siteContent } from "@/lib/cms-site";

export function generateMetadata() {
  const C = siteContent().company;
  return {
    metadataBase: new URL(C.website || "https://www.surraa.com"),
    title: { default: `${C.name} | ${C.location}`, template: "%s" },
    description: C.seoDescription,
    icons: { icon: C.favicon },
    openGraph: { type: "website", siteName: C.name, images: [C.ogImage] },
    twitter: { card: "summary_large_image" },
  };
}
export function generateViewport() { return { themeColor: siteContent().company.backgroundColor, width: "device-width", initialScale: 1, viewportFit: "cover" }; }

export default function RootLayout({ children }) {
  const C = siteContent().company;
  return (
    <html lang="en" style={{ "--night": C.backgroundColor, "--green": C.primaryColor, "--volt": C.accentColor, "--grad": `linear-gradient(100deg,${C.primaryColor} 0%,${C.accentColor} 100%)` }}>
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
