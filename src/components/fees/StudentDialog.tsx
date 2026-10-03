import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveStudent } from "@/lib/fees.functions";
import { todayISO, type Student } from "@/lib/fees";

const empty = { name: "", grade: "", monthly_fee: "", join_date: todayISO(), phone: "", parent_name: "", notes: "" };

export function StudentDialog({ open, student, onClose }: { open: boolean; student?: Student | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(student ? {
      name: student.name, grade: student.grade, monthly_fee: String(student.monthly_fee), join_date: student.join_date,
      phone: student.phone ?? "", parent_name: student.parent_name ?? "", notes: student.notes ?? "",
    } : { ...empty, join_date: todayISO() });
  }, [open, student]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const fee = Number(f.monthly_fee);
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    if (!f.grade.trim()) { toast.error("Grade is required"); return; }
    if (!f.monthly_fee || !Number.isFinite(fee) || fee < 0) { toast.error("Enter a valid monthly fee"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.join_date)) { toast.error("Choose a valid join date"); return; }
    setSaving(true);
    const payload = {
      name: f.name.trim(), grade: f.grade.trim(), monthly_fee: Math.round(fee), join_date: f.join_date,
      phone: f.phone.trim() || null, parent_name: f.parent_name.trim() || null, notes: f.notes.trim() || null,
    };
    if (student) {
      const res = await saveStudent({
        data: {
          id: student.id,
          name: payload.name,
          grade: payload.grade,
          monthly_fee: payload.monthly_fee,
          join_date: payload.join_date,
          phone: payload.phone,
          parent_name: payload.parent_name,
          notes: payload.notes,
        },
      });
      if (!res.ok) { setSaving(false); toast.error(res.error); return; }
      toast.success("Student updated");
    } else {
      const res = await saveStudent({
        data: {
          name: payload.name,
          grade: payload.grade,
          monthly_fee: payload.monthly_fee,
          join_date: payload.join_date,
          phone: payload.phone,
          parent_name: payload.parent_name,
          notes: payload.notes,
        },
      });
      if (!res.ok) { setSaving(false); toast.error(res.error); return; }
      toast.success("Student added");
    }
    setSaving(false);
    await qc.invalidateQueries({ queryKey: ["app-data"] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle>
          {student && <DialogDescription>A fee change applies from this month onward. Past months stay as they were.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input className="h-11 rounded-xl" value={f.name} onChange={set("name")} maxLength={80} required /></div>
          <div className="space-y-1.5"><Label>Grade *</Label><Input className="h-11 rounded-xl" value={f.grade} onChange={set("grade")} placeholder="Grade 8" maxLength={30} required /></div>
          <div className="space-y-1.5"><Label>Monthly fee (Rs) *</Label><Input className="h-11 rounded-xl" type="number" inputMode="numeric" min={0} value={f.monthly_fee} onChange={set("monthly_fee")} required /></div>
          <div className="space-y-1.5"><Label>Join date *</Label><Input className="h-11 rounded-xl" type="date" value={f.join_date} onChange={set("join_date")} required /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input className="h-11 rounded-xl" type="tel" value={f.phone} onChange={set("phone")} placeholder="923001234567" maxLength={20} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Parent name</Label><Input className="h-11 rounded-xl" value={f.parent_name} onChange={set("parent_name")} maxLength={80} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea className="rounded-xl" value={f.notes} onChange={set("notes")} maxLength={500} /></div>
          <Button type="submit" className="col-span-2 mt-1" disabled={saving}>{saving ? "Saving…" : student ? "Save changes" : "Add student"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
