# Tuition Fee Tracker

Private, single-owner tuition fee tracking built with TanStack Start, React,
Drizzle ORM, and Neon PostgreSQL.

## Neon setup

1. Create a Neon project and copy its **pooled** connection string from
   **Project → Connect**.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to that connection
   string. Keep this variable server-side; do not rename it to `VITE_*`.
3. Open the Neon SQL Editor and run the complete contents of
   [`neon_setup.sql`](./neon_setup.sql) once. It creates the owner/session
   tables, fee tables, indexes, monthly snapshot functions, row-level security,
   and constraints. It does not seed sample students.
4. Start the app with `npm run dev`.
5. On the first visit, create the one owner account. Public signup is disabled
   after that first account exists.

The application uses Neon directly through the server-only `DATABASE_URL`.
No Supabase project, URL, anon key, or client SDK is required.

## Development

```sh
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Neon PostgreSQL
- Drizzle ORM

Students can be permanently deleted from the Students screen after a
confirmation. Their payments and monthly fee snapshots are deleted by the
database foreign-key cascade.
"# tuition-tracker" 
