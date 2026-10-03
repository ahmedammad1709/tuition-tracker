import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Download, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { changeOwnerPassword } from "@/lib/auth.functions";
import { appDataQuery, downloadFile } from "@/lib/fees";
import { useSignOut } from "./route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageSkeleton } from "@/components/fees/ui-bits";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tuition Fee Tracker" },
      { name: "description", content: "Settings for your tuition fees." },
      { property: "og:title", content: "Settings — Tuition Fee Tracker" },
      { property: "og:description", content: "Settings for your tuition fees." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useQuery(appDataQuery);
  const signOut = useSignOut();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  if (!data) return <PageSkeleton />;
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await changeOwnerPassword({ data: { currentPassword, newPassword } });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password changed");
  }
  function backup() {
    downloadFile(
      "tuition-fee-tracker-backup.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
  }
  return (
    <>
      <PageHeader title="Settings" subtitle="Keep your account secure and your records portable." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-emerald-mid">
              <KeyRound />
            </div>
            <div>
              <h2 className="font-semibold">Change password</h2>
              <p className="text-sm text-muted-foreground">Use at least eight characters.</p>
            </div>
          </div>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Change password"}
            </Button>
          </form>
        </section>
        <section className="space-y-5">
          <div className="card-surface p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-emerald-mid">
                <Database />
              </div>
              <div>
                <h2 className="font-semibold">Your data</h2>
                <p className="text-sm text-muted-foreground">
                  Download a copy of every student, month, and payment record.
                </p>
              </div>
            </div>
            <Button variant="outline" className="mt-5" onClick={backup}>
              <Download />
              Download backup
            </Button>
          </div>
          <div className="card-surface p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-emerald-mid">
                <ShieldCheck />
              </div>
              <div>
                <h2 className="font-semibold">Private by design</h2>
                <p className="text-sm text-muted-foreground">
                  Only your owner session can access your records. Neon stores the database; the app
                  handles login sessions.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut />
            Log out
          </Button>
        </section>
      </div>
    </>
  );
}
