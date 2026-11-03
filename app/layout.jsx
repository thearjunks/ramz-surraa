import "./globals.css";
import { C } from "@/lib/site";

const desc = "SURRAA Community Association, Kuwait — live music and community events. Request your entry pass online.";

export const metadata = {
  metadataBase: new URL(C.website || "https://www.surraa.com"),
  title: { default: "SURRAA Community Association | Kuwait", template: "%s" },
  description: desc,
  openGraph: { type: "website", siteName: "SURRAA Community Association", images: ["/images/poster-en.jpg"] },
  twitter: { card: "summary_large_image" },
};
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
