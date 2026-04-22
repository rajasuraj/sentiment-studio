import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FileUp,
  FlaskConical,
  LayoutDashboard,
  Menu,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ApiStatusBadge } from "@/components/ApiStatusBadge";
import { BrandLogo } from "@/components/BrandLogo";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Upload", end: true, icon: FileUp },
  { to: "/cleaning", label: "Cleaning", icon: Sparkles },
  { to: "/train", label: "Train", icon: FlaskConical },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/predict", label: "Predict", icon: Activity },
  { to: "/logs", label: "Logs", icon: ScrollText },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Upload",
    subtitle: "Import one or two CSV datasets into your workspace.",
  },
  "/cleaning": {
    title: "Cleaning",
    subtitle: "Map columns, normalize text, and merge sources.",
  },
  "/train": {
    title: "Train",
    subtitle: "Classical ML with grid search and transformer fine-tuning.",
  },
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Metrics, charts, and deployment guidance.",
  },
  "/predict": {
    title: "Predict",
    subtitle: "Run inference with full audit logging.",
  },
  "/logs": {
    title: "Logs",
    subtitle: "SQLite-backed prediction history.",
  },
};

function pageMeta(pathname: string) {
  return titles[pathname] ?? titles["/"];
}

function NavItems({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-white text-accent shadow-md ring-1 ring-slate-200/60"
                : "text-slate-600 hover:bg-white/70 hover:text-ink-900"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-all duration-200",
                  isActive ? "bg-accent opacity-100" : "bg-accent opacity-0 group-hover:opacity-40"
                )}
              />
              <item.icon
                className={cn(
                  "ml-1 h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                  isActive ? "text-accent" : "text-slate-400 group-hover:text-slate-600"
                )}
                strokeWidth={1.75}
              />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-slate-200/70 bg-slate-50/95 shadow-sm lg:flex">
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-200/60 px-5 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200/80">
            <BrandLogo className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold tracking-tight text-ink-950">
              Sentiment Studio
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500">by OOP Technologies</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Workspace
            </p>
          </div>
        </div>
        <div className="px-3 pt-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Analyze
          </p>
          <NavItems className="p-1" />
        </div>
        <div className="mt-auto border-t border-slate-200/60 p-4">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Artifacts under{" "}
            <code className="rounded-lg bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm ring-1 ring-slate-200/80">
              data/workspace
            </code>
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-slate-200/80 bg-slate-50 shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200/60 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <BrandLogo className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-ink-950">Sentiment Studio</p>
              <p className="truncate text-[10px] text-slate-500">OOP Technologies</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white hover:text-ink-900"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3">
          <NavItems onNavigate={() => setMobileOpen(false)} className="p-1" />
        </div>
      </aside>

      <div className="lg:pl-[17rem]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-ink-900"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate font-display text-sm font-semibold text-ink-950">{meta.title}</span>
          <div className="w-10 shrink-0" />
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-20 hidden border-b border-slate-200/70 bg-white/80 backdrop-blur-xl lg:block">
          <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-6 px-8">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">
                {meta.title}
              </h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">{meta.subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <ApiStatusBadge />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
