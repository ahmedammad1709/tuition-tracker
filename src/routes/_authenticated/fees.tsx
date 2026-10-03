import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  appDataQuery,
  currentMonth,
  formatRs,
  monthLabel,
  monthTotals,
  type Row,
} from "@/lib/fees";
import { Button } from "@/components/ui/button";
import { PaymentDialog, type PaymentTarget } from "@/components/fees/PaymentDialog";
import {
  EmptyState,
  MonthPicker,
  PageHeader,
  PageSkeleton,
  StatusBadge,
} from "@/components/fees/ui-bits";
import { deletePayment } from "@/lib/fees.functions";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({
    meta: [
      { title: "Fees — Tuition Fee Tracker" },
      { name: "description", content: "Fees for your tuition fees." },
      { property: "og:title", content: "Fees — Tuition Fee Tracker" },
      { property: "og:description", content: "Fees for your tuition fees." },
    ],
  }),
  component: FeesPage,
});

function FeesPage() {
  const { data, isLoading, error } = useQuery(appDataQuery);
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return (
      <EmptyState
        icon={<Trash2 />}
        title="Could not load fees"
        text="Refresh the page and try again."
      />
    );
  const { rows, expected, collected, remaining } = monthTotals(data, month);
  async function remove(paymentId: string) {
    if (!window.confirm("Delete this payment? This cannot be undone.")) return;
    const result = await deletePayment({ data: { paymentId } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["app-data"] });
    toast.success("Payment deleted");
  }
  return (
    <>
      <PageHeader
        title="Monthly fees"
        subtitle="Record payments, partial payments, and late payments."
        action={<MonthPicker month={month} onChange={setMonth} />}
      />
      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Summary label="Expected" value={expected} />
        <Summary label="Collected" value={collected} tone="paid" />
        <Summary label="Remaining" value={remaining} tone="unpaid" />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No learners for this month"
          text="Add a student or choose another month."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <FeeRow
              key={row.student.id}
              row={row}
              onPay={() =>
                setTarget({
                  studentId: row.student.id,
                  studentName: row.student.name,
                  month,
                  due: row.due,
                  paid: row.paid,
                })
              }
              onEdit={(payment) =>
                setTarget({
                  studentId: row.student.id,
                  studentName: row.student.name,
                  month,
                  due: row.due,
                  paid: row.paid,
                  editing: payment,
                })
              }
              onDelete={remove}
            />
          ))}
        </div>
      )}
      <PaymentDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

function FeeRow({
  row,
  onPay,
  onEdit,
  onDelete,
}: {
  row: Row;
  onPay: () => void;
  onEdit: (payment: Row["payments"][number]) => void;
  onDelete: (id: string) => void;
}) {
  const phone = (row.student.phone ?? "").replace(/\D/g, "");
  const whatsApp = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Assalam o Alaikum, this is a reminder that ${row.student.name}'s fee of Rs ${row.balance.toLocaleString("en-PK")} for ${monthLabel(row.month)} is pending.`)}`
    : null;
  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{row.student.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.student.grade} · Due {formatRs(row.due)}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3 text-center text-xs">
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="mt-1 font-semibold">{formatRs(row.paid)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Balance</p>
          <p className={`mt-1 font-semibold ${row.balance ? "text-unpaid" : "text-paid"}`}>
            {formatRs(row.balance)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Payments</p>
          <p className="mt-1 font-semibold">{row.payments.length}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant={row.status === "paid" ? "outline" : "default"} onClick={onPay}>
          {row.status === "paid" ? "Add another" : "Add payment"}
        </Button>
        {whatsApp && row.status !== "paid" && (
          <a
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent"
            href={whatsApp}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            Remind
          </a>
        )}
        {row.payments.length > 0 && (
          <div className="flex items-center gap-1 sm:ml-auto">
            {row.payments.map((payment) => (
              <span
                key={payment.id}
                className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground"
              >
                <span>{formatRs(payment.amount)}</span>
                <button
                  aria-label={`Edit payment ${payment.amount}`}
                  onClick={() => onEdit(payment)}
                  className="text-emerald-mid hover:text-primary"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  aria-label={`Delete payment ${payment.amount}`}
                  onClick={() => onDelete(payment.id)}
                  className="text-unpaid hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "paid" | "unpaid";
}) {
  return (
    <div className="card-surface p-3 sm:p-4">
      <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      <p
        className={`mt-1 text-base font-semibold sm:text-lg ${tone === "paid" ? "text-paid" : tone === "unpaid" ? "text-unpaid" : ""}`}
      >
        {formatRs(value)}
      </p>
    </div>
  );
}
