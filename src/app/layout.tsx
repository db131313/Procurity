import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { SiteProviders } from "@/components/SiteProviders";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Procurity.Pro — Construction signage procurement intel",
  description:
    "Know who is ready to buy signage. Daily Top 20 NYC construction sites ranked by procurement-window probability, with contacts and 3D maps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
