"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", match: ["/home"] },
  { href: "/map", label: "Map", match: ["/map", "/opportunity"] },
  { href: "/pipeline", label: "Pipeline", match: ["/pipeline"] },
  { href: "/alerts", label: "Alerts", match: ["/alerts"] },
  { href: "/more", label: "More", match: ["/more", "/pricing", "/signin"] },
] as const;

function Icon({ label }: { label: string }) {
  switch (label) {
    case "Home":
      return (
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "Map":
      return (
        <>
          <path
            d="M9 4.5 4.5 6.2v13L9 17.5l6 2.3 4.5-1.7v-13L15 6.8 9 4.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinejoin="round"
          />
          <path d="M9 4.5v13M15 6.8v13" stroke="currentColor" strokeWidth="1.8" />
        </>
      );
    case "Pipeline":
      return (
        <>
          <rect x="4" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <rect x="10" y="9" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <rect x="16" y="3" width="4" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
        </>
      );
    case "Alerts":
      return (
        <path
          d="M6 16h12l-1.2-2.1a6.2 6.2 0 0 1-1-3.4V9a3.8 3.8 0 1 0-7.6 0v1.5c0 1.2-.35 2.4-1 3.4L6 16Zm4.2 2.2a1.8 1.8 0 0 0 3.6 0"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return (
        <>
          <circle cx="6" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="18" cy="12" r="1.6" fill="currentColor" />
        </>
      );
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 border-t border-pc-line/80 bg-white/95 px-2 pb-[calc(10px+var(--safe-bottom))] pt-2 backdrop-blur-md">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold tracking-wide ${
                  isActive ? "text-[#7C3AED]" : "text-[#64748B]"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <Icon label={item.label} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
