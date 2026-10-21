import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit AFM fonts must resolve from node_modules on Netlify/serverless
  serverExternalPackages: ["bcryptjs", "pdfkit"],
  // Allow phone/browser previews via localtunnel / Cloudflare quick tunnels
  allowedDevOrigins: ["*.loca.lt", "*.trycloudflare.com", "*.ngrok-free.app"],
  async redirects() {
    return [
      { source: "/demo", destination: "/", permanent: false },
      { source: "/demo/:path*", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
