import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, FileJson, FileSpreadsheet } from "lucide-react";
import {
  appDataQuery,
  currentMonth,
  downloadFile,
  formatRs,
  monthLabel,
  monthTotals,
  outstandingByStudent,
  shiftMonth,
  toCSV,
} from "@/lib/fees";
import { Button } from "@/components/ui/button";
import { EmptyState, MonthPicker, PageHeader, PageSkeleton } from "@/components/fees/ui-bits";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Tuition Fee Tracker" },
      { name: "description", content: "Reports for your tuition fees." },
      { property: "og:title", content: "Reports — Tuition Fee Tracker" },
      { property: "og:description", content: "Reports for your tuition fees." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery(appDataQuery);
  const [month, setMonth] = useState(currentMonth());
  if (isLoading || !data) return <PageSkeleton />;
  const totals = monthTotals(data, month);
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(month, i - 11);
    const t = monthTotals(data, m);
    return { month: m, ...t };
  });
  const byGrade = useMemo(
    () =>
      [...new Set(data.students.map((s) => s.grade))].sort().map((grade) => {
        const students = data.students.filter((s) => s.grade === grade);
        const rows = totals.rows.filter((r) => r.student.grade === grade);
        return {
          grade,
          count: students.length,
          expected: rows.reduce((n, r) => n + r.due, 0),
          collected: rows.reduce((n, r) => n + Math.min(r.paid, r.due), 0),
        };
      }),
    [data, totals.rows],
  );
  const outstanding = outstandingByStudent(data);
  function exportMonth() {
    downloadFile(
      `fees-${month}.csv`,
      toCSV(
        totals.rows.map((r) => ({
          student: r.student.name,
          grade: r.student.grade,
          month: r.month,
          due: r.due,
          paid: r.paid,
          balance: r.balance,
          status: r.status,
        })),
      ),
    );
  }
  function backup() {
    downloadFile(
      "tuition-fee-tracker-backup.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
  }
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="See collection patterns and all outstanding balances."
        action={<MonthPicker month={month} onChange={setMonth} />}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportMonth}>
          <FileSpreadsheet />
          Export month CSV
        </Button>
        <Button variant="outline" onClick={backup}>
          <FileJson />
          Backup JSON
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Collection by month</h2>
              <p className="text-sm text-muted-foreground">Collected compared with expected</p>
            </div>
            <BarChart3 className="text-emerald-mid" />
          </div>
          <div className="mt-6 space-y-3">
            {monthly.map((item) => {
              const percent = item.expected
                ? Math.round((item.collected / item.expected) * 100)
                : 0;
              return (
                <div key={item.month}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{monthLabel(item.month)}</span>
                    <span className="font-semibold">
                      {formatRs(item.collected)}{" "}
                      <span className="font-normal text-muted-foreground">({percent}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-champagne">
                    <div
                      className="h-full rounded-full bg-emerald-bright"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-surface p-5">
          <h2 className="font-semibold">Grade overview</h2>
          <p className="text-sm text-muted-foreground">For {monthLabel(month)}</p>
          <div className="mt-4 space-y-3">
            {byGrade.map((item) => (
              <div key={item.grade} className="rounded-2xl bg-muted p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{item.grade}</span>
                  <span className="text-xs text-muted-foreground">{item.count} students</span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>{formatRs(item.collected)} collected</span>
                  <span>{formatRs(item.expected)} expected</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 card-surface p-5">
        <h2 className="font-semibold">Outstanding by student</h2>
        <p className="text-sm text-muted-foreground">
          All unpaid and partial months through {monthLabel(currentMonth())}
        </p>
        {outstanding.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Months</th>
                  <th className="pb-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((item) => (
                  <tr key={item.student.id} className="border-t border-border">
                    <td className="py-3 font-medium">{item.student.name}</td>
                    <td className="py-3">{item.student.grade}</td>
                    <td className="py-3">{item.months}</td>
                    <td className="py-3 text-right font-semibold text-unpaid">
                      {formatRs(item.owed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No outstanding balances.
          </div>
        )}
      </div>
    </>
  );
}
