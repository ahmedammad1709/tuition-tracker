import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Receipt, BarChart3, Settings, Users } from "lucide-react";
import { getAuthState, logoutOwner } from "@/lib/auth.functions";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const state = await getAuthState();
    if (!state.authenticated) throw redirect({ to: "/auth" });
    return { email: state.email };
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/fees", label: "Fees", icon: Receipt },
  { to: "/students", label: "Students", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await logoutOwner();
    navigate({ to: "/auth", replace: true });
  };
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-primary p-5 text-primary-foreground md:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-champagne">
            <BrandMark className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Fee Tracker</div>
            <div className="text-xs opacity-70">Tuition records</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium opacity-80 transition hover:bg-emerald-mid hover:opacity-100"
              activeProps={{ className: "bg-emerald-bright opacity-100 shadow-soft" }}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-80 transition hover:bg-emerald-mid hover:opacity-100"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-5 py-3.5 text-primary-foreground shadow-soft md:hidden">
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-champagne">
          <BrandMark className="h-full w-full object-cover" />
        </div>
        <span className="font-semibold">Fee Tracker</span>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-10">
        <div key={pathname} className="animate-page">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-emerald-mid bg-primary px-1 pb-[env(safe-area-inset-bottom)] text-primary-foreground md:hidden">
        {nav.map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "opacity-100" : "opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-12 place-items-center rounded-full transition",
                  active && "bg-emerald-bright",
                )}
              >
                <n.icon className="h-5 w-5" />
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
