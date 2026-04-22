import { useId } from "react";
import { cn } from "@/lib/cn";

/** Inline mark for Sentiment Studio — scales with `className` (e.g. h-10 w-10). */
export function BrandLogo({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ss-grad-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="0.45" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradId})`} />
      <path
        d="M11 23c2.8 3.2 6.4 5 9 5s6.2-1.8 9-5"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.95"
      />
      <circle cx="14" cy="16" r="2.25" fill="white" opacity="0.92" />
      <circle cx="26" cy="16" r="2.25" fill="white" opacity="0.92" />
    </svg>
  );
}
