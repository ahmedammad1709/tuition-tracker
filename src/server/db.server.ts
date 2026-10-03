// Server-only. Never imported by client code (the `.server.ts` suffix makes
// TanStack Start treat this module as server-exclusive).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../drizzle/schema";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL. Paste your Neon connection string into .env " +
      "(Neon dashboard → Project → Connect → Connection string).",
  );
}

/** Raw Neon tagged-template client — used for calling SQL functions. */
export const neonSql = neon(connectionString);

/** Drizzle query builder bound to the Tuition Fee Tracker schema. */
export const db = drizzle(neonSql, { schema });
