import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** The single owner account. `id` is always true so there can only ever be one row. */
export const appOwner = pgTable("app_owner", {
  id: boolean("id").primaryKey().default(true),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

/** Login sessions. Only a hash of the cookie token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    ownerId: boolean("owner_id")
      .notNull()
      .default(true)
      .references(() => appOwner.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_expires_at_idx").on(t.expiresAt)],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    parentName: text("parent_name"),
    phone: text("phone"),
    monthlyFee: numeric("monthly_fee", { precision: 10, scale: 0 }).notNull(),
    joinDate: date("join_date", { mode: "string" })
      .notNull()
      .default(sql`current_date`),
    status: text("status").notNull().default("active"),
    leaveDate: date("leave_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("students_monthly_fee_check", sql`${t.monthlyFee} >= 0`)],
);

export const monthlyRecords = pgTable(
  "monthly_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    feeDue: numeric("fee_due", { precision: 10, scale: 0 }).notNull(),
  },
  (t) => [
    unique("monthly_records_student_id_month_key").on(t.studentId, t.month),
    index("monthly_records_month_idx").on(t.month),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    amount: numeric("amount", { precision: 10, scale: 0 }).notNull(),
    paidOn: date("paid_on", { mode: "string" })
      .notNull()
      .default(sql`current_date`),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payments_student_month_idx").on(t.studentId, t.month)],
);

export type AppOwnerRow = typeof appOwner.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type MonthlyRecordRow = typeof monthlyRecords.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
