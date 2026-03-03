import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Reverse Proxy Rewrites
   *
   * All /api/* requests from the browser hit the frontend domain (same origin).
   * Next.js server-side forwards them to the backend.
   *
   * Result: Browser sees one domain → SameSite=Lax cookies work on mobile.
   *
   * Required Railway env vars on FRONTEND service:
   *   NEXT_PUBLIC_API_URL = /api
   *   BACKEND_URL         = https://your-backend.railway.app
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      console.warn(
        "\n⚠️  [next.config] BACKEND_URL is not set!\n" +
        "   Set BACKEND_URL=https://your-backend.railway.app in Railway environment variables.\n" +
        "   Without it, /api/* requests will fail in production.\n"
      );
      // In local dev, fall back to localhost
      return [
        {
          source: "/api/:path*",
          destination: `http://localhost:3001/:path*`,
        },
      ];
    }

    const base = backendUrl.replace(/\/$/, ""); // Strip trailing slash

    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
