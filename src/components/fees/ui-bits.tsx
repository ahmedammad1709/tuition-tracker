import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { monthLabel, shiftMonth, type FeeStatus } from "@/lib/fees";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft">
      <button
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-secondary active:scale-95"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
      <button
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-secondary active:scale-95"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

const statusStyles: Record<FeeStatus, string> = {
  paid: "bg-paid-bg text-emerald-mid",
  partial: "bg-partial-bg text-partial",
  unpaid: "bg-unpaid-bg text-unpaid",
};
const statusDot: Record<FeeStatus, string> = { paid: "bg-paid", partial: "bg-partial", unpaid: "bg-unpaid" };
export function StatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status])} />
      {status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Unpaid"}
    </span>
  );
}

export function CountUp({ value, prefix = "Rs " }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); from.current = value; return; }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(begin + (value - begin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{Math.round(display).toLocaleString("en-PK")}</>;
}

export function AnimatedBar({ value, className, track = "bg-champagne" }: { value: number; className?: string; track?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.max(0, Math.min(100, value))), 80); return () => clearTimeout(t); }, [value]);
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full", track)}>
      <div className={cn("h-full rounded-full bg-paid transition-[width] duration-1000 ease-out", className)} style={{ width: `${w}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-12 text-center animate-rise">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SuccessCheck() {
  return (
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-paid animate-pop">
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path className="check-path text-primary-foreground" d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  );
}

export function Stagger({ children, i }: { children: ReactNode; i: number }) {
  return <div className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>{children}</div>;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-champagne/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-28" />)}
      </div>
      <SkeletonBlock className="h-64" />
    </div>
  );
}
