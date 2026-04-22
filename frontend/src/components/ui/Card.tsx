import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  padding = "p-6",
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn("card", hover && "card-hover", padding, className)}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink-950">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 leading-snug max-w-xl">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
