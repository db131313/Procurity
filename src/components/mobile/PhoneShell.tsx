import { BottomNav } from "./BottomNav";

export function PhoneShell({
  children,
  showNav = true,
  className = "",
}: {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  return (
    <div className={`pc-phone-shell ${className}`}>
      <div className={showNav ? "pc-bottom-pad relative min-h-full" : "relative min-h-full"}>
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
