"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  BriefcaseBusiness, CalendarClock, Check, ChevronRight, CircleUserRound,
  ContactRound, FileText, LayoutDashboard, Plus, Search,
  Sparkles, Target, Trash2, UsersRound, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

const CandidateProfileView = dynamic(
  () => import("@/components/profile/candidate-profile-view").then((module) => module.CandidateProfileView),
  { loading: () => <div className="py-20 text-center text-sm text-muted-foreground">Loading candidate profile…</div> },
);

const statuses = ["Interested", "Preparing Application", "Applied", "Online Assessment", "Interview Scheduled", "Interviewing", "Waiting for Response", "Offer Received", "Accepted", "Rejected", "Withdrawn", "Closed/Expired"];
const priorities = ["High", "Medium", "Low"];
const workModes = ["Remote", "Hybrid", "On-site"];
const tracks = ["Full-Stack", "Backend", "Frontend", "Cloud", "Robotics", "Machine Learning", "Mobile", "Other"];
const interviewStages = ["", "Recruiter Screen", "Technical Interview", "Hiring Manager", "Final Interview"];
const outcomes = ["", "Pending", "Passed", "Rejected"];

type Application = {
  id: string; company: string; role: string; track: string; location: string;
  workMode: string; applicationUrl: string; dateFound: string; deadline: string;
  dateApplied: string; status: string; priority: string; nextAction: string;
  followUpDate: string; resumeVersion: string; coverLetterUrl: string;
  portfolioSubmitted: boolean; githubSubmitted: boolean; referral: string;
  contactPerson: string; contactInfo: string; notes: string; interviewDate: string;
  interviewStage: string; assessment: string; assessmentDeadline: string;
  interviewOutcome: string; compensation: string; duration: string; startDate: string;
  visaRelocation: string; offerDeadline: string; createdAt: number; updatedAt: number;
};

type Draft = Omit<Application, "id" | "createdAt" | "updatedAt">;
type View = "overview" | "applications" | "interviews" | "contacts" | "profile";

const emptyDraft: Draft = {
  company: "", role: "", track: "Full-Stack", location: "", workMode: "Remote",
  applicationUrl: "", dateFound: "", deadline: "", dateApplied: "", status: "Interested",
  priority: "Medium", nextAction: "", followUpDate: "", resumeVersion: "",
  coverLetterUrl: "", portfolioSubmitted: false, githubSubmitted: false, referral: "",
  contactPerson: "", contactInfo: "", notes: "", interviewDate: "", interviewStage: "",
  assessment: "", assessmentDeadline: "", interviewOutcome: "", compensation: "",
  duration: "", startDate: "", visaRelocation: "", offerDeadline: "",
};

const statusStyle: Record<string, string> = {
  Interested: "bg-slate-100 text-slate-700", "Preparing Application": "bg-violet-100 text-violet-700",
  Applied: "bg-blue-100 text-blue-700", "Online Assessment": "bg-amber-100 text-amber-700",
  "Interview Scheduled": "bg-cyan-100 text-cyan-700", Interviewing: "bg-indigo-100 text-indigo-700",
  "Waiting for Response": "bg-orange-100 text-orange-700", "Offer Received": "bg-emerald-100 text-emerald-700",
  Accepted: "bg-green-100 text-green-700", Rejected: "bg-rose-100 text-rose-700",
  Withdrawn: "bg-zinc-100 text-zinc-600", "Closed/Expired": "bg-zinc-100 text-zinc-600",
};

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function firstName(name: string) {
  const clean = name.replace(/[._-]/g, " ").trim();
  return clean.split(" ")[0] || "there";
}

function daysUntil(value: string) {
  if (!value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}><Label>{label}</Label>{children}</div>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <Field label={label}><Select value={value || "__none"} onValueChange={(next) => onChange(next === "__none" ? "" : next)}><SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item || "__none"} value={item || "__none"}>{item || "Not set"}</SelectItem>)}</SelectContent></Select></Field>;
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={`border-0 px-2.5 py-1 ${statusStyle[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</Badge>;
}

export function InternshipTracker({ displayName }: { displayName: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/applications")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load applications");
        setApplications(data.applications);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => applications.filter((app) => {
    const haystack = `${app.company} ${app.role} ${app.track} ${app.location}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (filter === "All statuses" || app.status === filter);
  }), [applications, search, filter]);

  const active = applications.filter((app) => !["Rejected", "Withdrawn", "Closed/Expired", "Accepted"].includes(app.status));
  const interviewing = applications.filter((app) => ["Interview Scheduled", "Interviewing"].includes(app.status));
  const offers = applications.filter((app) => ["Offer Received", "Accepted"].includes(app.status));
  const responseRate = applications.length ? Math.round((applications.filter((app) => !["Interested", "Preparing Application", "Applied"].includes(app.status)).length / applications.length) * 100) : 0;
  const nextItems = applications
    .flatMap((app) => [
      app.followUpDate ? { app, date: app.followUpDate, label: app.nextAction || "Follow up" } : null,
      app.assessmentDeadline ? { app, date: app.assessmentDeadline, label: app.assessment || "Assessment due" } : null,
      app.interviewDate ? { app, date: app.interviewDate, label: app.interviewStage || "Interview" } : null,
      app.deadline && !app.dateApplied ? { app, date: app.deadline, label: "Application deadline" } : null,
    ])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => (daysUntil(item.date) ?? -1) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  function openCreate() {
    setEditingId(null); setDraft(emptyDraft); setEditorOpen(true);
  }

  function openEdit(app: Application) {
    const { id, createdAt, updatedAt, ...values } = app;
    void createdAt; void updatedAt;
    setEditingId(id); setDraft(values); setSelected(null); setEditorOpen(true);
  }

  async function saveApplication(event: FormEvent) {
    event.preventDefault();
    if (!draft.company.trim() || !draft.role.trim()) return toast.error("Add the company and role first.");
    setSaving(true);
    try {
      const response = await fetch("/api/applications", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: editingId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save application");
      setApplications((current) => editingId ? current.map((app) => app.id === editingId ? data.application : app) : [data.application, ...current]);
      setEditorOpen(false);
      toast.success(editingId ? "Application updated" : "Application added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save application");
    } finally { setSaving(false); }
  }

  async function deleteApplication(app: Application) {
    try {
      const response = await fetch(`/api/applications?id=${encodeURIComponent(app.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete application");
      setApplications((current) => current.filter((item) => item.id !== app.id));
      setSelected(null); toast.success("Application removed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete application"); }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const nav = [
    { id: "overview" as View, label: "Overview", icon: LayoutDashboard, count: null },
    { id: "applications" as View, label: "Applications", icon: BriefcaseBusiness, count: applications.length },
    { id: "interviews" as View, label: "Interviews", icon: UsersRound, count: interviewing.length },
    { id: "contacts" as View, label: "Contacts", icon: ContactRound, count: applications.filter((app) => app.contactPerson).length },
    { id: "profile" as View, label: "Profile & CVs", icon: CircleUserRound, count: null },
  ];

  return <SidebarProvider>
    <Toaster position="top-right" richColors />
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/80">
      <SidebarHeader className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#dfe7ff] text-[#4260c3]"><Sparkles className="size-4" /></div>
          <div><p className="font-semibold tracking-tight">Internship Tracker</p><p className="text-xs text-muted-foreground">Career workspace</p></div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{nav.map((item) => <SidebarMenuItem key={item.id}><SidebarMenuButton isActive={view === item.id} onClick={() => setView(item.id)}><item.icon /><span>{item.label}</span>{item.count !== null && <span className="ml-auto text-xs text-muted-foreground">{item.count}</span>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Quick action</SidebarGroupLabel>
          <SidebarGroupContent><Button onClick={openCreate} className="mx-2 w-[calc(100%-1rem)] justify-start rounded-xl bg-[#5271df] shadow-none hover:bg-[#4663c7]"><Plus />Add application</Button></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-xl border bg-white/70 p-3"><div className="flex size-8 items-center justify-center rounded-full bg-[#f0e6ff] text-[#7c5bb0]"><CircleUserRound className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName}</p><p className="text-xs text-muted-foreground">Personal workspace</p></div><Button variant="ghost" size="icon-xs" onClick={signOut} aria-label="Sign out"><LogOut /></Button></div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[#fbfcff]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-[#fbfcff]/90 px-4 backdrop-blur-md md:px-8"><SidebarTrigger className="md:hidden" /><div className="flex items-center gap-2 text-sm text-muted-foreground"><span>My workspace</span><ChevronRight className="size-3.5" /><span className="font-medium text-foreground capitalize">{view === "profile" ? "Profile & CVs" : view}</span></div>{view !== "profile" && <div className="ml-auto md:hidden"><Button size="sm" onClick={openCreate}><Plus />Add</Button></div>}</header>
      <div className="mx-auto w-full max-w-[1480px] px-4 py-7 md:px-8 md:py-10">
        {view === "overview" && <Overview name={firstName(displayName)} applications={applications} active={active.length} interviewing={interviewing.length} offers={offers.length} responseRate={responseRate} nextItems={nextItems} loading={loading} onAdd={openCreate} onOpen={setSelected} onViewApplications={() => setView("applications")} />}
        {view === "applications" && <ApplicationsView applications={filtered} total={applications.length} loading={loading} search={search} filter={filter} onSearch={setSearch} onFilter={setFilter} onAdd={openCreate} onOpen={setSelected} />}
        {view === "interviews" && <InterviewsView applications={applications.filter((app) => app.interviewDate || app.interviewStage || app.assessment)} onOpen={setSelected} onAdd={openCreate} />}
        {view === "contacts" && <ContactsView applications={applications.filter((app) => app.contactPerson || app.contactInfo || app.referral)} onOpen={setSelected} onAdd={openCreate} />}
        {view === "profile" && <CandidateProfileView displayName={displayName} />}
      </div>
    </SidebarInset>

    <ApplicationEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} editing={Boolean(editingId)} saving={saving} onSubmit={saveApplication} />
    <ApplicationDetails app={selected} onOpenChange={(open) => !open && setSelected(null)} onEdit={openEdit} onDelete={deleteApplication} />
  </SidebarProvider>;
}

function PageTitle({ title, description, onAdd }: { title: string; description: string; onAdd: () => void }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#242933] md:text-4xl">{title}</h1><p className="mt-2 text-base text-muted-foreground">{description}</p></div><Button onClick={onAdd} className="w-fit rounded-xl bg-[#5271df] shadow-[0_8px_24px_rgba(82,113,223,.18)] hover:bg-[#4663c7]"><Plus />Add application</Button></div>;
}

function Overview({ name, applications, active, interviewing, offers, responseRate, nextItems, loading, onAdd, onOpen, onViewApplications }: { name: string; applications: Application[]; active: number; interviewing: number; offers: number; responseRate: number; nextItems: { app: Application; date: string; label: string }[]; loading: boolean; onAdd: () => void; onOpen: (app: Application) => void; onViewApplications: () => void }) {
  const stats = [
    { label: "Total applications", value: applications.length, icon: BriefcaseBusiness, color: "bg-[#e9efff] text-[#4c68cb]" },
    { label: "Active pipeline", value: active, icon: Target, color: "bg-[#e6f7f1] text-[#35896e]" },
    { label: "Interviews", value: interviewing, icon: UsersRound, color: "bg-[#f3eafd] text-[#8157ae]" },
    { label: "Offers", value: offers, icon: Check, color: "bg-[#fff1dc] text-[#a86b20]" },
  ];
  const pipeline = ["Interested", "Applied", "Online Assessment", "Interviewing", "Offer Received"];
  return <>
    <PageTitle title={`Good to see you, ${name}.`} description="Here’s a calm view of your internship search." onAdd={onAdd} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <article key={stat.label} className="rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(28,35,50,.03)]"><div className={`mb-5 flex size-10 items-center justify-center rounded-xl ${stat.color}`}><stat.icon className="size-5" /></div><p className="text-3xl font-semibold tracking-tight">{loading ? "—" : stat.value}</p><p className="mt-1 text-sm text-muted-foreground">{stat.label}</p></article>)}</section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <article className="rounded-2xl border bg-white p-5 md:p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Application pipeline</h2><p className="mt-1 text-sm text-muted-foreground">Where your opportunities currently stand</p></div><button onClick={onViewApplications} className="text-sm font-medium text-[#5271df] hover:underline">View all</button></div>{applications.length === 0 ? <EmptyState title="Your pipeline is ready" text="Add the first internship you’re interested in and build from there." onAdd={onAdd} /> : <div className="space-y-5">{pipeline.map((status) => { const count = applications.filter((app) => app.status === status || (status === "Interviewing" && app.status === "Interview Scheduled") || (status === "Offer Received" && app.status === "Accepted")).length; const pct = Math.round(count / applications.length * 100); return <div key={status}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{status}</span><span className="text-muted-foreground">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef1f6]"><div className="h-full rounded-full bg-[#7890e5] transition-all" style={{ width: `${Math.max(pct, count ? 5 : 0)}%` }} /></div></div>; })}</div>}</article>
      <article className="rounded-2xl border bg-white p-5 md:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold">Next up</h2><p className="mt-1 text-sm text-muted-foreground">Deadlines and follow-ups</p></div><div className="rounded-xl bg-[#fff3e4] p-2 text-[#b6782d]"><CalendarClock className="size-5" /></div></div>{nextItems.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><CalendarClock className="mb-3 size-8 text-[#bdc5d4]" /><p className="font-medium">Nothing urgent</p><p className="mt-1 max-w-52 text-sm text-muted-foreground">Upcoming dates will appear here as you add them.</p></div> : <div className="space-y-2">{nextItems.map((item, index) => <button key={`${item.app.id}-${index}`} onClick={() => onOpen(item.app)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[#f7f9fc]"><div className="w-12 rounded-lg bg-[#eef2ff] py-2 text-center"><p className="text-xs font-semibold text-[#526ac0]">{formatDate(item.date).split(" ").slice(0,2).join(" ")}</p></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.label}</p><p className="truncate text-xs text-muted-foreground">{item.app.company} · {item.app.role}</p></div><ChevronRight className="size-4 text-muted-foreground" /></button>)}</div>}</article>
    </section>
    {applications.length > 0 && <section className="mt-5 rounded-2xl border bg-[#f1f5ff] p-5 md:flex md:items-center md:justify-between"><div><p className="text-sm font-medium text-[#3f559f]">Response rate</p><p className="mt-1 text-2xl font-semibold text-[#293a77]">{responseRate}%</p></div><p className="mt-2 max-w-lg text-sm leading-6 text-[#5b6c9f] md:mt-0">Keep each status current so you can see which applications are converting into assessments and interviews.</p></section>}
  </>;
}

function ApplicationsView({ applications, total, loading, search, filter, onSearch, onFilter, onAdd, onOpen }: { applications: Application[]; total: number; loading: boolean; search: string; filter: string; onSearch: (value: string) => void; onFilter: (value: string) => void; onAdd: () => void; onOpen: (app: Application) => void }) {
  return <><PageTitle title="Applications" description={`${total} ${total === 1 ? "opportunity" : "opportunities"} in your tracker`} onAdd={onAdd} /><div className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search company, role, track, or location" className="h-10 border-0 bg-[#f5f7fa] pl-9 shadow-none focus-visible:ring-2" /></div><Select value={filter} onValueChange={onFilter}><SelectTrigger className="h-10 w-full bg-white sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All statuses">All statuses</SelectItem>{statuses.map((status) => <SelectItem value={status} key={status}>{status}</SelectItem>)}</SelectContent></Select></div>
    {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading your applications…</div> : applications.length === 0 ? <EmptyState title={total ? "No matching applications" : "Add your first application"} text={total ? "Try a different search or status filter." : "Capture the role, deadline, materials, contacts, and every next step."} onAdd={total ? undefined : onAdd} /> : <Table><TableHeader><TableRow className="bg-[#fafbfc]"><TableHead className="h-12 pl-5">Company & role</TableHead><TableHead>Status</TableHead><TableHead>Track</TableHead><TableHead>Priority</TableHead><TableHead>Next action</TableHead><TableHead>Deadline</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{applications.map((app) => <TableRow key={app.id} onClick={() => onOpen(app)} className="cursor-pointer"><TableCell className="py-4 pl-5"><div className="flex items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef1f8] font-semibold text-[#5f6980]">{app.company.charAt(0).toUpperCase()}</div><div><p className="font-medium text-[#252a34]">{app.company}</p><p className="mt-0.5 text-xs text-muted-foreground">{app.role}{app.location ? ` · ${app.location}` : ""}</p></div></div></TableCell><TableCell><StatusBadge status={app.status} /></TableCell><TableCell className="text-muted-foreground">{app.track}</TableCell><TableCell><span className={`inline-flex items-center gap-1.5 text-sm ${app.priority === "High" ? "text-rose-600" : "text-muted-foreground"}`}><span className={`size-1.5 rounded-full ${app.priority === "High" ? "bg-rose-500" : app.priority === "Medium" ? "bg-amber-400" : "bg-slate-300"}`} />{app.priority}</span></TableCell><TableCell className="max-w-60 truncate text-muted-foreground">{app.nextAction || "—"}</TableCell><TableCell className="text-muted-foreground">{formatDate(app.deadline)}</TableCell><TableCell><ChevronRight className="size-4 text-muted-foreground" /></TableCell></TableRow>)}</TableBody></Table>}</div></>;
}

function InterviewsView({ applications, onOpen, onAdd }: { applications: Application[]; onOpen: (app: Application) => void; onAdd: () => void }) {
  const sorted = [...applications].sort((a, b) => (a.interviewDate || a.assessmentDeadline || "9999").localeCompare(b.interviewDate || b.assessmentDeadline || "9999"));
  return <><PageTitle title="Interviews & assessments" description="Prepare for every stage without losing the details." onAdd={onAdd} />{sorted.length === 0 ? <div className="rounded-2xl border bg-white"><EmptyState title="No interviews yet" text="Interview and assessment details will gather here automatically." onAdd={onAdd} /></div> : <div className="grid gap-4 lg:grid-cols-2">{sorted.map((app) => <button key={app.id} onClick={() => onOpen(app)} className="rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(29,37,53,.07)]"><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold">{app.company}</p><p className="mt-1 text-sm text-muted-foreground">{app.role}</p></div><StatusBadge status={app.status} /></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><MiniDetail icon={UsersRound} label="Stage" value={app.interviewStage || "Not set"} /><MiniDetail icon={CalendarClock} label="Interview" value={formatDate(app.interviewDate)} /><MiniDetail icon={FileText} label="Assessment" value={app.assessment || "None"} /><MiniDetail icon={Target} label="Outcome" value={app.interviewOutcome || "Pending"} /></div></button>)}</div>}</>;
}

function ContactsView({ applications, onOpen, onAdd }: { applications: Application[]; onOpen: (app: Application) => void; onAdd: () => void }) {
  return <><PageTitle title="Contacts" description="Recruiters, hiring managers, and referrals connected to your search." onAdd={onAdd} />{applications.length === 0 ? <div className="rounded-2xl border bg-white"><EmptyState title="No contacts saved" text="Add a recruiter, hiring manager, or referral inside an application." onAdd={onAdd} /></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{applications.map((app) => <button key={app.id} onClick={() => onOpen(app)} className="rounded-2xl border bg-white p-5 text-left transition hover:shadow-[0_10px_28px_rgba(29,37,53,.06)]"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-[#edf1ff] text-[#5a70c6]"><ContactRound className="size-5" /></div><div><p className="font-semibold">{app.contactPerson || "Contact not named"}</p><p className="text-sm text-muted-foreground">{app.company}</p></div></div><div className="mt-5 space-y-2 text-sm"><p className="truncate text-muted-foreground">{app.contactInfo || "No contact information"}</p>{app.referral && <p><span className="text-muted-foreground">Referral:</span> {app.referral}</p>}</div></button>)}</div>}</>;
}

function MiniDetail({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f8fb] p-3"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</div><p className="truncate text-sm font-medium">{value}</p></div>;
}

function EmptyState({ title, text, onAdd }: { title: string; text: string; onAdd?: () => void }) {
  return <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#edf1ff] text-[#5c73ca]"><BriefcaseBusiness className="size-5" /></div><h3 className="font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>{onAdd && <Button onClick={onAdd} variant="outline" className="mt-5 rounded-xl"><Plus />Add application</Button>}</div>;
}

function ApplicationEditor({ open, onOpenChange, draft, setDraft, editing, saving, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; draft: Draft; setDraft: (draft: Draft) => void; editing: boolean; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfe4ee] bg-[#fbfcff] p-0 sm:max-w-3xl"><form onSubmit={onSubmit}><DialogHeader className="sticky top-0 z-10 border-b bg-[#fbfcff]/95 px-6 py-5 text-left backdrop-blur"><DialogTitle>{editing ? "Edit application" : "New application"}</DialogTitle><DialogDescription>Keep the full opportunity record together. You can leave fields blank and return later.</DialogDescription></DialogHeader><div className="space-y-7 p-6">
    <FormSection title="Opportunity"><div className="grid gap-4 md:grid-cols-2"><Field label="Company"><Input required value={draft.company} onChange={(e) => update("company", e.target.value)} placeholder="e.g. NVIDIA" /></Field><Field label="Role"><Input required value={draft.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Robotics Software Intern" /></Field><SelectField label="Track" value={draft.track} values={tracks} onChange={(v) => update("track", v)} /><Field label="Location"><Input value={draft.location} onChange={(e) => update("location", e.target.value)} placeholder="City, country" /></Field><SelectField label="Work mode" value={draft.workMode} values={workModes} onChange={(v) => update("workMode", v)} /><Field label="Application link"><Input type="url" value={draft.applicationUrl} onChange={(e) => update("applicationUrl", e.target.value)} placeholder="https://" /></Field><Field label="Date found"><Input type="date" value={draft.dateFound} onChange={(e) => update("dateFound", e.target.value)} /></Field><Field label="Application deadline"><Input type="date" value={draft.deadline} onChange={(e) => update("deadline", e.target.value)} /></Field></div></FormSection>
    <FormSection title="Progress"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Status" value={draft.status} values={statuses} onChange={(v) => update("status", v)} /><SelectField label="Priority" value={draft.priority} values={priorities} onChange={(v) => update("priority", v)} /><Field label="Date applied"><Input type="date" value={draft.dateApplied} onChange={(e) => update("dateApplied", e.target.value)} /></Field><Field label="Follow-up date"><Input type="date" value={draft.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} /></Field><Field label="Next action" wide><Input value={draft.nextAction} onChange={(e) => update("nextAction", e.target.value)} placeholder="e.g. Follow up with recruiter" /></Field></div></FormSection>
    <FormSection title="Application materials"><div className="grid gap-4 md:grid-cols-2"><Field label="Resume version"><Input value={draft.resumeVersion} onChange={(e) => update("resumeVersion", e.target.value)} placeholder="e.g. Robotics CV v3" /></Field><Field label="Cover letter link"><Input type="url" value={draft.coverLetterUrl} onChange={(e) => update("coverLetterUrl", e.target.value)} placeholder="https://" /></Field><div className="flex items-center gap-3 rounded-xl border bg-white p-3"><Checkbox id="portfolio" checked={draft.portfolioSubmitted} onCheckedChange={(v) => update("portfolioSubmitted", Boolean(v))} /><Label htmlFor="portfolio" className="cursor-pointer font-normal">Portfolio submitted</Label></div><div className="flex items-center gap-3 rounded-xl border bg-white p-3"><Checkbox id="github" checked={draft.githubSubmitted} onCheckedChange={(v) => update("githubSubmitted", Boolean(v))} /><Label htmlFor="github" className="cursor-pointer font-normal">GitHub submitted</Label></div></div></FormSection>
    <FormSection title="People"><div className="grid gap-4 md:grid-cols-2"><Field label="Contact person"><Input value={draft.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} placeholder="Recruiter or hiring manager" /></Field><Field label="Email or LinkedIn"><Input value={draft.contactInfo} onChange={(e) => update("contactInfo", e.target.value)} placeholder="Contact details" /></Field><Field label="Referral" wide><Input value={draft.referral} onChange={(e) => update("referral", e.target.value)} placeholder="Person who referred you" /></Field></div></FormSection>
    <FormSection title="Interview & assessment"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Interview stage" value={draft.interviewStage} values={interviewStages} onChange={(v) => update("interviewStage", v)} /><Field label="Interview date"><Input type="date" value={draft.interviewDate} onChange={(e) => update("interviewDate", e.target.value)} /></Field><Field label="Assessment"><Input value={draft.assessment} onChange={(e) => update("assessment", e.target.value)} placeholder="e.g. Take-home coding task" /></Field><Field label="Assessment deadline"><Input type="date" value={draft.assessmentDeadline} onChange={(e) => update("assessmentDeadline", e.target.value)} /></Field><SelectField label="Interview outcome" value={draft.interviewOutcome} values={outcomes} onChange={(v) => update("interviewOutcome", v)} /></div></FormSection>
    <FormSection title="Offer details"><div className="grid gap-4 md:grid-cols-2"><Field label="Compensation"><Input value={draft.compensation} onChange={(e) => update("compensation", e.target.value)} placeholder="Salary or stipend" /></Field><Field label="Duration"><Input value={draft.duration} onChange={(e) => update("duration", e.target.value)} placeholder="e.g. 3 months" /></Field><Field label="Start date"><Input type="date" value={draft.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field><Field label="Offer deadline"><Input type="date" value={draft.offerDeadline} onChange={(e) => update("offerDeadline", e.target.value)} /></Field><Field label="Visa / relocation" wide><Input value={draft.visaRelocation} onChange={(e) => update("visaRelocation", e.target.value)} placeholder="Required, sponsored, or not required" /></Field></div></FormSection>
    <FormSection title="Notes"><Field label="Important details"><Textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Requirements, preparation notes, questions, or anything else worth remembering" className="min-h-28" /></Field></FormSection>
  </div><DialogFooter className="sticky bottom-0 border-t bg-[#fbfcff]/95 px-6 py-4 backdrop-blur"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#5271df] hover:bg-[#4663c7]">{saving ? "Saving…" : editing ? "Save changes" : "Add application"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8497]">{title}</h3>{children}</section>;
}

function ApplicationDetails({ app, onOpenChange, onEdit, onDelete }: { app: Application | null; onOpenChange: (open: boolean) => void; onEdit: (app: Application) => void; onDelete: (app: Application) => void }) {
  if (!app) return null;
  const details = [
    ["Track", app.track], ["Location", app.location], ["Work mode", app.workMode], ["Priority", app.priority],
    ["Date found", formatDate(app.dateFound)], ["Deadline", formatDate(app.deadline)], ["Date applied", formatDate(app.dateApplied)], ["Follow-up", formatDate(app.followUpDate)],
    ["Resume", app.resumeVersion], ["Portfolio", app.portfolioSubmitted ? "Submitted" : "Not submitted"], ["GitHub", app.githubSubmitted ? "Submitted" : "Not submitted"], ["Referral", app.referral],
    ["Contact", app.contactPerson], ["Contact info", app.contactInfo], ["Interview stage", app.interviewStage], ["Interview date", formatDate(app.interviewDate)],
    ["Assessment", app.assessment], ["Assessment due", formatDate(app.assessmentDeadline)], ["Outcome", app.interviewOutcome], ["Compensation", app.compensation],
    ["Duration", app.duration], ["Start date", formatDate(app.startDate)], ["Visa / relocation", app.visaRelocation], ["Offer deadline", formatDate(app.offerDeadline)],
  ];
  return <Sheet open={Boolean(app)} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto border-l bg-[#fbfcff] p-0 sm:max-w-2xl"><SheetHeader className="border-b bg-white px-6 py-6 pr-14"><div className="mb-2 flex items-center gap-2"><StatusBadge status={app.status} />{app.priority === "High" && <Badge className="border-0 bg-rose-100 text-rose-700">High priority</Badge>}</div><SheetTitle className="text-2xl tracking-tight">{app.company}</SheetTitle><SheetDescription className="text-base">{app.role}</SheetDescription></SheetHeader><div className="space-y-7 p-6">{app.nextAction && <div className="rounded-2xl border border-[#dce4ff] bg-[#eef3ff] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#6375b2]">Next action</p><p className="mt-2 font-medium text-[#2f4385]">{app.nextAction}</p></div>}
    <section><h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Application details</h3><dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="border-b pb-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || "—"}</dd></div>)}</dl></section>
    {(app.applicationUrl || app.coverLetterUrl) && <section><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Links</h3><div className="flex flex-wrap gap-2">{app.applicationUrl && <Button asChild variant="outline" size="sm"><a href={app.applicationUrl} target="_blank" rel="noreferrer">Application page</a></Button>}{app.coverLetterUrl && <Button asChild variant="outline" size="sm"><a href={app.coverLetterUrl} target="_blank" rel="noreferrer">Cover letter</a></Button>}</div></section>}
    {app.notes && <section><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notes</h3><p className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-[#495264]">{app.notes}</p></section>}
  </div><SheetFooter className="sticky bottom-0 flex-row border-t bg-white/95 px-6 py-4 backdrop-blur"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="mr-auto text-muted-foreground hover:bg-rose-50 hover:text-rose-600"><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this application?</AlertDialogTitle><AlertDialogDescription>This will permanently remove {app.company} — {app.role} from your tracker.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(app)} className="bg-rose-600 hover:bg-rose-700">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button onClick={() => onEdit(app)} className="bg-[#5271df] hover:bg-[#4663c7]">Edit application</Button></SheetFooter></SheetContent></Sheet>;
}
