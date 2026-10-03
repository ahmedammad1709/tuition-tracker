import { createServerFn } from "@tanstack/react-start";

import type { AppData, PaymentInput, StudentInput } from "./fees-types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Expected failures are returned (not thrown) so messages survive production builds. */
async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Students + monthly snapshots + payments. Fills in missing months, then reads. */
export const getAppData = createServerFn({ method: "GET" }).handler(async (): Promise<AppData> => {
  const fees = await import("../server/fees.server");
  return fees.loadAppData();
});

/** Create a student, or update one (a fee change applies from the current month). */
export const saveStudent = createServerFn({ method: "POST" })
  .validator((data: StudentInput) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const fees = await import("../server/fees.server");
      await fees.saveStudent(data);
    }),
  );

export const setStudentStatus = createServerFn({ method: "POST" })
  .validator(
    (data: { studentId: string; status: "active" | "left"; leaveDate: string | null }) => data,
  )
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const fees = await import("../server/fees.server");
      await fees.setStudentStatus(data.studentId, data.status, data.leaveDate);
    }),
  );

export const deleteStudent = createServerFn({ method: "POST" })
  .validator((data: { studentId: string }) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const fees = await import("../server/fees.server");
      await fees.deleteStudent(data.studentId);
    }),
  );

/** Record a payment, or update an existing one. */
export const savePayment = createServerFn({ method: "POST" })
  .validator((data: PaymentInput) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const fees = await import("../server/fees.server");
      await fees.savePayment(data);
    }),
  );

export const deletePayment = createServerFn({ method: "POST" })
  .validator((data: { paymentId: string }) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const fees = await import("../server/fees.server");
      await fees.deletePayment(data.paymentId);
    }),
  );
