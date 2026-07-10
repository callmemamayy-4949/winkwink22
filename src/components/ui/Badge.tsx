import type { ReactNode } from "react";

const TONE_CLASSES = {
  primary: "bg-gradient-primary text-on-primary shadow-sm",
  mint: "bg-pastel-mint text-pastel-mint-text",
  purple: "bg-pastel-purple text-pastel-purple-text",
  yellow: "bg-pastel-yellow text-pastel-yellow-text",
  white: "bg-white/95 text-text-strong shadow-sm backdrop-blur",
  neutral: "bg-surface-container text-text",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-display inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
