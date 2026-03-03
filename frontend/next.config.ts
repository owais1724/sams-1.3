import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Reverse Proxy — route all /api/* requests through Next.js server to the backend.
   *
   * WHY THIS SOLVES MOBILE LOGIN:
   * Without this, the browser calls backend.railway.app directly (cross-domain).
   * Safari iOS blocks cross-domain SameSite=None cookies (ITP).
   *
   * WITH this, the browser calls our own frontend domain (/api/*).
   * Next.js server-side forwards the request to the backend.
   * The browser sees only ONE domain → SameSite=Lax cookies work perfectly.
   * Mobile browsers (Safari, Chrome) accept the cookies without any issues.
   *
   * Security: HTTP-only cookies remain HTTP-only. Nothing exposed to JS.
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // Strip trailing slash
    const base = backendUrl.replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
