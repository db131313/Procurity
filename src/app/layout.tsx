import type { Metadata, Viewport } from "next";
import { SiteProviders } from "@/components/SiteProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Procurity — Find the next job before they need you",
  description:
    "Mobile construction intel for signage sales. Top opportunities ranked by buy-probability with contacts and a free 3D map.",
  applicationName: "Procurity",
  appleWebApp: {
    capable: true,
    title: "Procurity",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#7C3AED",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full font-sans"
        style={{ ["--font-satoshi" as string]: "'Satoshi', ui-sans-serif, system-ui, sans-serif" }}
      >
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
