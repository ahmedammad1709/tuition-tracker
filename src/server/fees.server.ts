// Server-only: every read/write of fee data lives here and is guarded by requireOwner().
import { and, asc, desc, eq, gte } from "drizzle-orm";

import type {
  AppData,
  MonthlyRecord,
  Payment,
  PaymentInput,
  Student,
  StudentInput,
} from "../lib/fees-types";
import { monthlyRecords, payments, students } from "../../drizzle/schema";
import { requireOwner } from "./auth.server";
import { db, neonSql } from "./db.server";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mapStudent(row: typeof students.$inferSelect): Student {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    parent_name: row.parentName,
    phone: row.phone,
    monthly_fee: Number(row.monthlyFee),
    join_date: row.joinDate,
    status: row.status,
    leave_date: row.leaveDate,
    notes: row.notes,
    created_at: row.createdAt,
  };
}

function mapRecord(row: typeof monthlyRecords.$inferSelect): MonthlyRecord {
  return { id: row.id, student_id: row.studentId, month: row.month, fee_due: Number(row.feeDue) };
}

function mapPayment(row: typeof payments.$inferSelect): Payment {
  return {
    id: row.id,
    student_id: row.studentId,
    month: row.month,
    amount: Number(row.amount),
    paid_on: row.paidOn,
    note: row.note,
    created_at: row.createdAt,
  };
}

/** Everything the app needs for one screen: students, month snapshots, payments. */
export async function loadAppData(): Promise<AppData> {
  await requireOwner();

  // Fill in any missing monthly fee snapshots up to the current month.
  await neonSql`select public.ensure_monthly_records(${currentMonth()}::text)`;

  const [studentRows, recordRows, paymentRows] = await Promise.all([
    db.select().from(students).orderBy(asc(students.name)),
    db.select().from(monthlyRecords),
    db.select().from(payments).orderBy(desc(payments.paidOn)),
  ]);

  return {
    students: studentRows.map(mapStudent),
    records: recordRows.map(mapRecord),
    payments: paymentRows.map(mapPayment),
  };
}

export async function saveStudent(input: StudentInput): Promise<{ id: string | null }> {
  await requireOwner();

  const name = input.name?.trim() ?? "";
  const grade = input.grade?.trim() ?? "";
  const fee = Math.round(Number(input.monthly_fee));
  if (!name) throw new ValidationError("Name is required.");
  if (!grade) throw new ValidationError("Grade is required.");
  if (!Number.isFinite(fee) || fee < 0) throw new ValidationError("Enter a valid monthly fee.");
  if (!DATE_RE.test(input.join_date ?? "")) throw new ValidationError("Choose a valid join date.");

  const values = {
    name,
    grade,
    monthlyFee: String(fee),
    joinDate: input.join_date,
    phone: input.phone?.trim() || null,
    parentName: input.parent_name?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    if (!UUID_RE.test(input.id)) throw new ValidationError("Invalid student id.");
    const existing = await db.select().from(students).where(eq(students.id, input.id)).limit(1);
    if (!existing[0]) throw new ValidationError("Student not found.");

    await db.update(students).set(values).where(eq(students.id, input.id));

    // A fee change applies from the current month onward; past months keep their snapshot.
    if (Number(existing[0].monthlyFee) !== fee) {
      await db
        .update(monthlyRecords)
        .set({ feeDue: String(fee) })
        .where(
          and(eq(monthlyRecords.studentId, input.id), gte(monthlyRecords.month, currentMonth())),
        );
    }

    return { id: input.id };
  }

  const inserted = await db.insert(students).values(values).returning({ id: students.id });
  return { id: inserted[0]?.id ?? null };
}

export async function savePayment(input: PaymentInput): Promise<{ id: string | null }> {
  await requireOwner();

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new ValidationError("Enter an amount greater than 0.");
  if (!DATE_RE.test(input.paid_on ?? "")) throw new ValidationError("Choose a valid date.");
  if (!MONTH_RE.test(input.month ?? "")) throw new ValidationError("Invalid month.");
  if (!UUID_RE.test(input.student_id ?? "")) throw new ValidationError("Invalid student id.");

  const values = {
    studentId: input.student_id,
    month: input.month,
    amount: String(amount),
    paidOn: input.paid_on,
    note: input.note?.trim() || null,
  };

  if (input.id) {
    if (!UUID_RE.test(input.id)) throw new ValidationError("Invalid payment id.");
    await db.update(payments).set(values).where(eq(payments.id, input.id));
    return { id: input.id };
  }

  const inserted = await db.insert(payments).values(values).returning({ id: payments.id });
  return { id: inserted[0]?.id ?? null };
}

export async function setStudentStatus(
  studentId: string,
  status: "active" | "left",
  leaveDate: string | null,
): Promise<void> {
  await requireOwner();
  if (!UUID_RE.test(studentId)) throw new ValidationError("Invalid student id.");
  if (status === "left" && !DATE_RE.test(leaveDate ?? "")) {
    throw new ValidationError("Choose a valid leave date.");
  }
  const existing = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!existing[0]) throw new ValidationError("Student not found.");
  await db
    .update(students)
    .set({ status, leaveDate: status === "left" ? leaveDate : null })
    .where(eq(students.id, studentId));
  await neonSql`select public.ensure_monthly_records(${currentMonth()}::text)`;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await requireOwner();
  if (!UUID_RE.test(studentId)) throw new ValidationError("Invalid student id.");
  const deleted = await db
    .delete(students)
    .where(eq(students.id, studentId))
    .returning({ id: students.id });
  if (!deleted[0]) throw new ValidationError("Student not found.");
}

export async function deletePayment(paymentId: string): Promise<void> {
  await requireOwner();
  if (!UUID_RE.test(paymentId)) throw new ValidationError("Invalid payment id.");
  const deleted = await db
    .delete(payments)
    .where(eq(payments.id, paymentId))
    .returning({ id: payments.id });
  if (!deleted[0]) throw new ValidationError("Payment not found.");
}
