import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { getAuthState, loginOwner, registerOwner } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Tuition Fee Tracker" },
      { name: "description", content: "Sign in to your private tuition fee tracker." },
      { property: "og:title", content: "Sign in — Tuition Fee Tracker" },
      { property: "og:description", content: "Sign in to your private tuition fee tracker." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAuthState()
      .then((state) => {
        if (state.authenticated) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setSetupRequired(state.setupRequired);
      })
      .catch(() => setSetupRequired(null));
  }, [navigate]);

  const setup = setupRequired === true;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (setupRequired === null) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const res = setup
      ? await registerOwner({ data: { email, password } })
      : await loginOwner({ data: { email, password } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-primary px-5">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-8 text-center text-primary-foreground">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-3xl bg-champagne shadow-lift">
            <BrandMark className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-semibold">Tuition Fee Tracker</h1>
          <p className="mt-1 text-sm opacity-80">
            {setup ? "Create your owner account" : "Welcome back, sign in to continue"}
          </p>
        </div>
        <div className="card-surface p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                required
                autoComplete="email"
                className="h-12 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                required
                autoComplete={setup ? "new-password" : "current-password"}
                className="h-12 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || setupRequired === null}
            >
              {busy ? "Please wait…" : setup ? "Create account" : "Sign in"}
            </Button>
            {setup && (
              <p className="text-center text-xs text-muted-foreground">
                One-time setup. After this, no one else can create an account.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
