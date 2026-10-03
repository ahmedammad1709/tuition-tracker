import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleAlert, Coins, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  appDataQuery,
  currentMonth,
  formatRs,
  monthLabel,
  monthTotals,
  rowsForMonth,
  shiftMonth,
} from "@/lib/fees";
import { Button } from "@/components/ui/button";
import { PaymentDialog, type PaymentTarget } from "@/components/fees/PaymentDialog";
import {
  AnimatedBar,
  CountUp,
  EmptyState,
  MonthPicker,
  PageHeader,
  StatusBadge,
  Stagger,
} from "@/components/fees/ui-bits";
import { PageSkeleton } from "@/components/fees/ui-bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Tuition Fee Tracker" },
      { name: "description", content: "Dashboard for your tuition fees." },
      { property: "og:title", content: "Dashboard — Tuition Fee Tracker" },
      { property: "og:description", content: "Dashboard for your tuition fees." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, error } = useQuery(appDataQuery);
  const [month, setMonth] = useState(currentMonth());
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return (
      <EmptyState
        icon={<CircleAlert />}
        title="Could not load your fees"
        text="Refresh the page and try again."
      />
    );
  const totals = monthTotals(data, month);
  const pending = totals.rows.filter((r) => r.status !== "paid");
  const activeCount = data.students.filter((s) => s.status === "active").length;
  const collectionPercent = totals.expected
    ? Math.round((totals.collected / totals.expected) * 100)
    : 0;
  const chart = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    const t = monthTotals(data, m);
    return {
      month: m,
      value: t.collected,
      percent: totals.expected ? Math.min(100, (t.collected / Math.max(t.expected, 1)) * 100) : 0,
    };
  });
  return (
    <>
      <PageHeader
        title="Good to see you"
        subtitle={`${monthLabel(month)} collection at a glance`}
        action={<MonthPicker month={month} onChange={setMonth} />}
      />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stagger i={0}>
          <Metric icon={<Coins />} label="Expected" value={<CountUp value={totals.expected} />} />
        </Stagger>
        <Stagger i={1}>
          <Metric
            icon={<CheckCircle2 />}
            label="Collected"
            value={<CountUp value={totals.collected} />}
            tone="paid"
          />
        </Stagger>
        <Stagger i={2}>
          <Metric
            icon={<CircleAlert />}
            label="Remaining"
            value={<CountUp value={totals.remaining} />}
            tone="unpaid"
          />
        </Stagger>
        <Stagger i={3}>
          <Metric
            icon={<Users />}
            label="Active students"
            value={String(activeCount)}
            suffix=" learners"
          />
        </Stagger>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.9fr]">
        <div className="card-emerald p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm opacity-75">This month</p>
              <h2 className="mt-1 text-3xl font-semibold">{collectionPercent}% collected</h2>
            </div>
            <Link
              to="/fees"
              className="inline-flex items-center gap-1 rounded-xl bg-champagne/15 px-3 py-2 text-xs font-semibold transition hover:bg-champagne/25"
            >
              Open fees <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <AnimatedBar value={collectionPercent} track="bg-white/15" className="bg-champagne" />
          </div>
          <p className="mt-2 text-xs opacity-70">
            {formatRs(totals.collected)} of {formatRs(totals.expected)} recorded
          </p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Last six months</h2>
              <p className="text-xs text-muted-foreground">Collection pace</p>
            </div>
            <span className="text-xs text-muted-foreground">PKR</span>
          </div>
          <div className="mt-5 flex h-32 items-end gap-2">
            {chart.map((item) => (
              <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-emerald-bright transition-all"
                    style={{ height: `${Math.max(6, item.percent)}%` }}
                    title={`${monthLabel(item.month, true)}: ${formatRs(item.value)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {monthLabel(item.month, true).split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Needs attention</h2>
            <p className="text-sm text-muted-foreground">
              {pending.length
                ? `${pending.length} learner${pending.length === 1 ? "" : "s"} still have a balance`
                : "Everyone is paid for this month"}
            </p>
          </div>
          <Link to="/fees" className="text-sm font-semibold text-emerald-mid hover:underline">
            View all
          </Link>
        </div>
        {pending.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.slice(0, 6).map((row, i) => (
              <Stagger key={row.student.id} i={i}>
                <div className="card-surface flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.student.grade} · {formatRs(row.balance)} remaining
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={row.status} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTarget({
                        studentId: row.student.id,
                        studentName: row.student.name,
                        month,
                        due: row.due,
                        paid: row.paid,
                      })
                    }
                  >
                    Add payment
                  </Button>
                </div>
              </Stagger>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle2 />}
            title="A clean month"
            text="Every learner has paid the full amount for this month."
          />
        )}
      </section>
      <PaymentDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "paid" | "unpaid";
  suffix?: string;
}) {
  return (
    <div className="card-surface card-lift p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${tone === "paid" ? "bg-paid-bg text-paid" : tone === "unpaid" ? "bg-unpaid-bg text-unpaid" : "bg-accent text-emerald-mid"}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 text-2xl font-semibold">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
