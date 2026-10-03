import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePayment } from "@/lib/fees.functions";
import { formatRs, monthLabel, todayISO, type Payment } from "@/lib/fees";
import { SuccessCheck } from "./ui-bits";

export type PaymentTarget = {
  studentId: string;
  studentName: string;
  month: string;
  due: number;
  paid: number;
  editing?: Payment;
};

export function PaymentDialog({ target, onClose }: { target: PaymentTarget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const balance = target ? Math.max(0, target.due - target.paid) : 0;

  useEffect(() => {
    if (!target) return;
    setCelebrate(false);
    if (target.editing) {
      setAmount(String(target.editing.amount));
      setDate(target.editing.paid_on);
      setNote(target.editing.note ?? "");
    } else {
      setAmount(String(balance || ""));
      setDate(todayISO());
      setNote("");
    }
  }, [target, balance]);

  async function save(value: number): Promise<void> {
    if (!target) return;
    if (!Number.isFinite(value) || value <= 0) { toast.error("Enter an amount greater than 0"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast.error("Choose a valid date"); return; }
    setSaving(true);
    const res = await savePayment({
      data: {
        id: target.editing?.id ?? null,
        student_id: target.studentId,
        month: target.month,
        amount: Math.round(value),
        paid_on: date,
        note: note.trim() || null,
      },
    });
    setSaving(false);
    if (!res.ok) { toast.error(res.error); return; }
    await qc.invalidateQueries({ queryKey: ["app-data"] });
    const prevPaid = target.paid - (target.editing ? Number(target.editing.amount) : 0);
    const fullNow = prevPaid + value >= target.due && target.due > 0;
    toast.success(target.editing ? "Payment updated" : "Payment saved");
    if (fullNow && !target.editing) {
      setCelebrate(true);
      setTimeout(onClose, 1400);
    } else onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
        {celebrate ? (
          <div className="py-8 text-center">
            <SuccessCheck />
            <p className="mt-4 text-lg font-semibold">Fully paid!</p>
            <p className="text-sm text-muted-foreground">{target?.studentName} · {target && monthLabel(target.month)}</p>
          </div>
        ) : target && (
          <>
            <DialogHeader>
              <DialogTitle>{target.editing ? "Edit payment" : "Add payment"}</DialogTitle>
              <DialogDescription>
                {target.studentName} · {monthLabel(target.month)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-3 text-center text-xs">
              <div><div className="text-muted-foreground">Due</div><div className="font-semibold">{formatRs(target.due)}</div></div>
              <div><div className="text-muted-foreground">Paid</div><div className="font-semibold">{formatRs(target.paid)}</div></div>
              <div><div className="text-muted-foreground">Balance</div><div className="font-semibold text-unpaid">{formatRs(balance)}</div></div>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); save(Number(amount)); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="amt">Amount (Rs)</Label>
                <Input id="amt" type="number" inputMode="numeric" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl text-lg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt">Date</Label>
                <Input id="dt" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt">Note (optional)</Label>
                <Input id="nt" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="h-12 rounded-xl" placeholder="e.g. Paid by father" />
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                {!target.editing && balance > 0 && (
                  <Button type="button" variant="success" className="flex-1" disabled={saving} onClick={() => save(balance)}>
                    Paid in full
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving…" : target.editing ? "Save changes" : "Save payment"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
