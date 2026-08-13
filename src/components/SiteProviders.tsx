"use client";

import { ToastProvider } from "@/components/ui/Toast";

export function SiteProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
