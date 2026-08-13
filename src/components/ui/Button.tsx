"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  href?: string;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "pc-gradient-bg text-white shadow-[0_12px_28px_rgba(124,108,246,0.28)] hover:brightness-105 hover:shadow-[0_16px_36px_rgba(124,108,246,0.34)]",
  secondary:
    "bg-white text-ink border border-line hover:bg-offwhite hover:shadow-md",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  dark: "bg-ink text-white hover:bg-ink/90",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition duration-200 active:scale-[0.97] disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
