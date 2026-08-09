export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pcP" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      {/* Stylized P / map-pin hybrid */}
      <path
        d="M20 10c0-2.2 1.8-4 4-4h14.5c9.1 0 16.5 7.2 16.5 16.2 0 7.2-4.7 13.4-11.4 15.5L36 54.2c-.7 1.4-2.7 1.4-3.4 0L25 37.7H24c-2.2 0-4-1.8-4-4V10z"
        fill="url(#pcP)"
      />
      <path
        d="M28 18h9.2c4.2 0 7.3 3 7.3 7.1S41.4 32.2 37.2 32.2H28V18z"
        fill="#0B1220"
        opacity="0.92"
      />
    </svg>
  );
}

export function LogoWordmark({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9" />
      <span
        className={`text-[17px] font-bold tracking-[0.14em] ${
          light ? "text-white" : "text-pc-ink"
        }`}
      >
        PROCURITY
      </span>
    </div>
  );
}
