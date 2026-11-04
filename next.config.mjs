/** @type {import('next').NextConfig} */
export default {
  trailingSlash: true,                         // clean URLs: /events/sundown-chapter-1/
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};
