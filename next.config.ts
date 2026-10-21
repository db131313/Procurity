import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit AFM fonts must resolve from node_modules on Netlify/serverless
  serverExternalPackages: ["bcryptjs", "pdfkit"],
  // Allow phone/browser previews via localtunnel / Cloudflare quick tunnels
  allowedDevOrigins: ["*.loca.lt", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
