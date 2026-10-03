import { queryOptions } from "@tanstack/react-query";
import { getAppData } from "./fees.functions";
import type { AppData, MonthlyRecord, Payment, Student } from "./fees-types";

export type { AppData, MonthlyRecord, Payment, Student } from "./fees-types";
export type FeeStatus = "paid" | "partial" | "unpaid";

export const pad = (n: number) => String(n).padStart(2, "0");
export const toMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const currentMonth = () => toMonth(new Date());
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export function shiftMonth(month: string, delta: number) {
  const [y = 2000, m = 1] = month.split("-").map(Number);
  return toMonth(new Date(y, m - 1 + delta, 1));
}
export function monthLabel(month: string, short = false) {
  const [y = 2000, m = 1] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}
export const formatRs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
export const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const appDataQuery = queryOptions({
  queryKey: ["app-data"],
  queryFn: async (): Promise<AppData> => getAppData(),
});

export type Row = {
  student: Student;
  month: string;
  due: number;
  paid: number;
  balance: number;
  status: FeeStatus;
  payments: Payment[];
};

export function statusOf(due: number, paid: number): FeeStatus {
  if (paid >= due) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

/** Fee rows for a month: one per student who has a record (or would, if in active range). */
export function rowsForMonth(data: AppData, month: string): Row[] {
  const rows: Row[] = [];
  for (const student of data.students) {
    const rec = data.records.find((r) => r.student_id === student.id && r.month === month);
    const joinM = student.join_date.slice(0, 7);
    const leaveM = student.leave_date?.slice(0, 7);
    const inRange = month >= joinM && (!leaveM || month <= leaveM);
    if (!rec && !inRange) continue;
    const due = Number(rec?.fee_due ?? student.monthly_fee);
    const payments = data.payments.filter((p) => p.student_id === student.id && p.month === month);
    const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
    rows.push({
      student,
      month,
      due,
      paid,
      balance: Math.max(0, due - paid),
      status: statusOf(due, paid),
      payments,
    });
  }
  return rows;
}

export function studentHistory(data: AppData, studentId: string): Row[] {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return [];
  const months = new Set(
    data.records.filter((r) => r.student_id === studentId).map((r) => r.month),
  );
  return [...months]
    .sort()
    .reverse()
    .map((m) => rowsForMonth({ ...data, students: [student] }, m)[0])
    .filter((r): r is Row => !!r);
}

export function monthTotals(data: AppData, month: string) {
  const rows = rowsForMonth(data, month);
  const expected = rows.reduce((a, r) => a + r.due, 0);
  const collected = rows.reduce((a, r) => a + Math.min(r.paid, r.due), 0);
  return { rows, expected, collected, remaining: Math.max(0, expected - collected) };
}

export function outstandingByStudent(data: AppData) {
  const upto = currentMonth();
  return data.students
    .map((s) => {
      const hist = studentHistory(data, s.id).filter((r) => r.month <= upto);
      const owed = hist.reduce((a, r) => a + r.balance, 0);
      const months = hist.filter((r) => r.balance > 0).length;
      return { student: s, owed, months };
    })
    .filter((x) => x.owed > 0)
    .sort((a, b) => b.owed - a.owed);
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function whatsappLink(row: Row) {
  const phone = (row.student.phone ?? "").replace(/\D/g, "");
  const msg = `Assalam o Alaikum, this is a reminder that ${row.student.name}'s fee of Rs ${row.balance.toLocaleString("en-PK")} for ${monthLabel(row.month)} is pending.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
