/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Reverse Proxy Rewrites
   *
   * All /api/* requests from the browser hit the frontend domain (same origin).
   * Next.js server-side forwards them to the backend.
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      console.warn(
        "\n⚠️  [next.config] BACKEND_URL is not set!\n" +
          "   Set BACKEND_URL=https://your-backend.onrender.com in environment variables.\n" +
          "   Without it, /api/* requests will fail in production.\n",
      );

      // In local dev, fall back to localhost.
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:3000/:path*",
        },
      ];
    }

    let base = backendUrl.replace(/\/$/, "");
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = `https://${base}`;
    }

    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
