import { createServerFn } from "@tanstack/react-start";

import type { AuthState } from "./fees-types";

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

/** Is the one-time owner account set up, and is this browser signed in? */
export const getAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    const auth = await import("../server/auth.server");
    const [exists, user] = await Promise.all([auth.ownerExists(), auth.getSessionUser()]);
    return { setupRequired: !exists, authenticated: user !== null, email: user?.email ?? null };
  },
);

/** One-time account creation. Signs the owner in immediately. */
export const registerOwner = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const auth = await import("../server/auth.server");
      await auth.registerOwner(data.email, data.password);
    }),
  );

export const loginOwner = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const auth = await import("../server/auth.server");
      const ok = await auth.login(data.email, data.password);
      if (!ok) throw new Error("Wrong email or password.");
    }),
  );

export const logoutOwner = createServerFn({ method: "POST" }).handler(
  async (): Promise<ActionResult> =>
    run(async () => {
      const auth = await import("../server/auth.server");
      await auth.logout();
    }),
);

export const changeOwnerPassword = createServerFn({ method: "POST" })
  .validator((data: { currentPassword: string; newPassword: string }) => data)
  .handler(({ data }): Promise<ActionResult> =>
    run(async () => {
      const auth = await import("../server/auth.server");
      await auth.changePassword(data.currentPassword, data.newPassword);
    }),
  );
