// Shared DTO + input types used by both the client (`@/lib/fees`) and the
// server (`@/server/*.server`). Plain types only — no runtime code — so this
// module is safe to import from either side of the boundary.

export type Student = {
  id: string;
  name: string;
  grade: string;
  parent_name: string | null;
  phone: string | null;
  monthly_fee: number;
  join_date: string;
  status: string;
  leave_date: string | null;
  notes: string | null;
  created_at: string;
};

export type MonthlyRecord = {
  id: string;
  student_id: string;
  month: string;
  fee_due: number;
};

export type Payment = {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  paid_on: string;
  note: string | null;
  created_at: string;
};

export type AppData = { students: Student[]; records: MonthlyRecord[]; payments: Payment[] };

export type StudentInput = {
  id?: string | null;
  name: string;
  grade: string;
  monthly_fee: number;
  join_date: string;
  status?: "active" | "left";
  leave_date?: string | null;
  phone: string | null;
  parent_name: string | null;
  notes: string | null;
};

export type PaymentInput = {
  id?: string | null;
  student_id: string;
  month: string;
  amount: number;
  paid_on: string;
  note: string | null;
};

export type AuthState = {
  setupRequired: boolean;
  authenticated: boolean;
  email: string | null;
};
