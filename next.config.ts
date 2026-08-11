import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // Allow phone/browser previews via localtunnel / Cloudflare quick tunnels
  allowedDevOrigins: ["*.loca.lt", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
