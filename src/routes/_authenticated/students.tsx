import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2, UserRound, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  appDataQuery,
  formatDate,
  formatRs,
  outstandingByStudent,
  studentHistory,
  type AppData,
  type Student,
  todayISO,
} from "@/lib/fees";
import { deleteStudent, setStudentStatus } from "@/lib/fees.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentDialog } from "@/components/fees/StudentDialog";
import { EmptyState, PageHeader, PageSkeleton, StatusBadge } from "@/components/fees/ui-bits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students — Tuition Fee Tracker" },
      { name: "description", content: "Students for your tuition fees." },
      { property: "og:title", content: "Students — Tuition Fee Tracker" },
      { property: "og:description", content: "Students for your tuition fees." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { data, isLoading, error } = useQuery(appDataQuery);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"active" | "left">("active");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [profile, setProfile] = useState<Student | null>(null);
  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return (
      <EmptyState
        icon={<UserRound />}
        title="Could not load students"
        text="Refresh the page and try again."
      />
    );
  const grades = [...new Set(data.students.map((s) => s.grade))].sort();
  const students = data.students.filter(
    (s) =>
      s.status === tab &&
      (grade === "all" || s.grade === grade) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  async function toggleStatus(student: Student) {
    const next = student.status === "active" ? "left" : "active";
    const leaveDate = next === "left" ? todayISO() : null;
    if (
      next === "left" &&
      !window.confirm(`Mark ${student.name} as left? Their history will stay intact.`)
    )
      return;
    const res = await setStudentStatus({
      data: { studentId: student.id, status: next, leaveDate },
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["app-data"] });
    toast.success(next === "left" ? "Student moved to Left" : "Student reactivated");
  }
  async function removeStudent(student: Student) {
    if (
      !window.confirm(
        `Permanently delete ${student.name}? This removes their payments and monthly fee history and cannot be undone.`,
      )
    )
      return;
    const res = await deleteStudent({ data: { studentId: student.id } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setProfile(null);
    await qc.invalidateQueries({ queryKey: ["app-data"] });
    toast.success("Student deleted");
  }
  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${data.students.length} learners in your records`}
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialog(true);
            }}
          >
            <Plus />
            Add student
          </Button>
        }
      />
      <div className="mb-4 flex gap-2 rounded-2xl bg-muted p-1">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${tab === "active" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
        >
          Active ({data.students.filter((s) => s.status === "active").length})
        </button>
        <button
          onClick={() => setTab("left")}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${tab === "left" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
        >
          Left ({data.students.filter((s) => s.status === "left").length})
        </button>
      </div>
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="all">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      {students.length === 0 ? (
        <EmptyState
          icon={<UserRound />}
          title={tab === "active" ? "No active students yet" : "No left students"}
          text={search ? "Try a different search." : "Add a student to start tracking fees."}
          action={
            !search && tab === "active" ? (
              <Button onClick={() => setDialog(true)}>Add your first student</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {students.map((student) => (
            <div key={student.id} className="card-surface card-lift p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-emerald-mid">
                  <UserRoundCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{student.name}</p>
                    <StatusBadge status={student.status === "active" ? "paid" : "unpaid"} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {student.grade} · {formatRs(student.monthly_fee)}/month
                  </p>
                  {student.parent_name && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Parent: {student.parent_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={() => setProfile(student)}>
                  <Eye />
                  Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(student);
                    setDialog(true);
                  }}
                >
                  <Pencil />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(student)}>
                  {student.status === "active" ? "Mark as left" : "Reactivate"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-unpaid hover:bg-unpaid-bg hover:text-unpaid"
                  onClick={() => removeStudent(student)}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <StudentDialog open={dialog} student={editing} onClose={() => setDialog(false)} />
      <StudentProfile student={profile} data={data} onClose={() => setProfile(null)} />
    </>
  );
}

function StudentProfile({
  student,
  data,
  onClose,
}: {
  student: Student | null;
  data: AppData;
  onClose: () => void;
}) {
  const history = student ? studentHistory(data, student.id) : [];
  const outstanding = student
    ? outstandingByStudent(data).find((x) => x.student.id === student.id)
    : null;
  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.name}</DialogTitle>
          <DialogDescription>
            {student?.grade} · Joined {student && formatDate(student.join_date)} ·{" "}
            {student?.status === "active" ? "Active" : "Left"}
          </DialogDescription>
        </DialogHeader>
        {student && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ProfileStat label="Current fee" value={formatRs(student.monthly_fee)} />
              <ProfileStat
                label="All-time paid"
                value={formatRs(history.reduce((sum, row) => sum + row.paid, 0))}
              />
              <ProfileStat label="Outstanding" value={formatRs(outstanding?.owed ?? 0)} />
              <ProfileStat label="Months due" value={String(outstanding?.months ?? 0)} />
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Month</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Paid</th>
                    <th className="px-3 py-3">Balance</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.month} className="border-t border-border">
                      <td className="px-3 py-3">{row.month}</td>
                      <td className="px-3 py-3">{formatRs(row.due)}</td>
                      <td className="px-3 py-3">{formatRs(row.paid)}</td>
                      <td className="px-3 py-3">{formatRs(row.balance)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
