import { cn } from "@/lib/cn";

const variants = {
  default: "bg-slate-100 text-slate-700 border-slate-200/80",
  accent: "bg-accent-muted text-accent border-indigo-200/60",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  danger: "bg-rose-50 text-rose-800 border-rose-200/70",
  warning: "bg-amber-50 text-amber-900 border-amber-200/70",
  neutral: "bg-white text-slate-600 border-slate-200 shadow-soft",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
