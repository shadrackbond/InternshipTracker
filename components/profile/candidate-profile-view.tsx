"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, Download, FileText, GraduationCap, Link2, Loader2,
  MapPin, Plus, ShieldCheck, Sparkles, Star, Trash2, Upload, UserRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyCandidateProfile, type CandidateProfile, type ProfileSkill, type ResumeRecord,
} from "@/lib/profile-types";

const tracks = ["Backend", "Full-Stack", "AI Integration", "Cloud & DevOps", "Robotics", "General"];
const skillCategories = ["Languages", "Backend", "Frontend", "Data", "Cloud & DevOps", "Security", "AI", "Tools", "Other"];
const workModes = ["Remote", "Hybrid", "On-site"];

function csvToList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function listToCsv(value: string[]) {
  return value.join(", ");
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatUploaded(value: number) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function profileCompleteness(profile: CandidateProfile) {
  const checks = [
    profile.fullName, profile.professionalHeadline, profile.email, profile.location,
    profile.summary, profile.institution, profile.degree, profile.expectedGraduation,
    profile.targetRoles.length, profile.preferredLocations.length, profile.availability,
    profile.workAuthorization, profile.skills.length >= 5,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}>
    <div><Label>{label}</Label>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>
    {children}
  </div>;
}

export function CandidateProfileView({ displayName }: { displayName: string }) {
  const [profile, setProfile] = useState<CandidateProfile>(emptyCandidateProfile);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("Backend CV");
  const [uploadTrack, setUploadTrack] = useState("Backend");
  const [newSkill, setNewSkill] = useState({ name: "", category: "Backend", evidence: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load profile");
        return data.profile as CandidateProfile;
      }),
      fetch("/api/resumes").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load CVs");
        return data.resumes as ResumeRecord[];
      }),
    ])
      .then(([candidateProfile, resumeRecords]) => {
        setProfile({ ...emptyCandidateProfile, ...candidateProfile });
        setResumes(resumeRecords);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load candidate profile"))
      .finally(() => setLoading(false));
  }, []);

  const completeness = useMemo(() => profileCompleteness(profile), [profile]);
  const skillGroups = useMemo(() => profile.skills.reduce<Record<string, ProfileSkill[]>>((groups, skill) => {
    const category = skill.category || "Other";
    groups[category] = [...(groups[category] || []), skill];
    return groups;
  }, {}), [profile.skills]);

  function update<K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save profile");
      setProfile(data.profile);
      toast.success("Candidate profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    const name = newSkill.name.trim();
    if (!name) return;
    if (profile.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("That skill is already in your profile.");
    }
    update("skills", [...profile.skills, {
      name,
      category: newSkill.category,
      verification: "user",
      evidence: newSkill.evidence.trim(),
    }]);
    setNewSkill({ name: "", category: newSkill.category, evidence: "" });
  }

  function removeSkill(name: string) {
    update("skills", profile.skills.filter((skill) => skill.name !== name));
  }

  function mergeResumeSkills(resume: ResumeRecord) {
    const current = new Map(profile.skills.map((skill) => [skill.name.toLowerCase(), skill]));
    for (const skill of resume.extractedSkills) {
      if (!current.has(skill.name.toLowerCase())) current.set(skill.name.toLowerCase(), skill);
    }
    update("skills", [...current.values()]);
    toast.success(`${resume.extractedSkills.length} detected skills added for review`);
  }

  async function uploadResume() {
    const file = fileInput.current?.files?.[0];
    if (!file) return toast.error("Choose a PDF first.");
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("label", uploadLabel);
      form.set("targetTrack", uploadTrack);
      const response = await fetch("/api/resumes", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload CV");
      setResumes((current) => [data.resume, ...current.map((resume) => data.resume.isPrimary ? { ...resume, isPrimary: false } : resume)]);
      if (fileInput.current) fileInput.current.value = "";
      toast.success("CV uploaded and analyzed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload CV");
    } finally {
      setUploading(false);
    }
  }

  async function updateResume(id: string, values: Partial<ResumeRecord>) {
    try {
      const response = await fetch("/api/resumes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update CV");
      setResumes((current) => current.map((resume) => resume.id === id
        ? data.resume
        : values.isPrimary ? { ...resume, isPrimary: false } : resume));
      toast.success(values.isPrimary ? "Primary CV updated" : "CV review saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update CV");
    }
  }

  async function deleteResume(resume: ResumeRecord) {
    try {
      const response = await fetch(`/api/resumes?id=${encodeURIComponent(resume.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove CV");
      setResumes((current) => {
        const remaining = current.filter((item) => item.id !== resume.id);
        if (resume.isPrimary && remaining.length) remaining[0] = { ...remaining[0], isPrimary: true };
        return remaining;
      });
      toast.success("CV removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove CV");
    }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading candidate profile…</div>;

  return <form onSubmit={saveProfile}>
    <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6573a6]">Candidate workspace</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#242933] md:text-4xl">Profile & CV Library</h1><p className="mt-2 max-w-2xl text-base text-muted-foreground">Build one verified career profile, then use the right CV for every opportunity.</p></div>
      <Button type="submit" disabled={saving} className="w-fit rounded-xl bg-[#5271df] shadow-[0_8px_24px_rgba(82,113,223,.18)] hover:bg-[#4663c7]">{saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Save profile</Button>
    </div>

    <div className="mb-6 grid gap-4 md:grid-cols-[1.4fr_.6fr]">
      <Card className="overflow-hidden border-[#dfe5f3] bg-[linear-gradient(135deg,#ffffff_0%,#f4f7ff_100%)] shadow-none">
        <CardContent className="flex flex-col gap-5 pt-1 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#e4ebff] text-[#4662c4]"><UserRound className="size-7" /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold">{profile.fullName || displayName}</h2>{profile.reviewed && <Badge className="border-0 bg-emerald-100 text-emerald-700"><CheckCircle2 />Reviewed</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{profile.professionalHeadline || `${profile.primaryTrack} candidate profile`}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">Primary: {profile.primaryTrack}</Badge><Badge variant="secondary">Secondary: {profile.secondaryTrack}</Badge>{profile.location && <Badge variant="outline"><MapPin />{profile.location}</Badge>}</div></div>
        </CardContent>
      </Card>
      <Card className="border-[#dfe5f3] shadow-none"><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle>Profile strength</CardTitle><span className="text-2xl font-semibold text-[#4059af]">{completeness}%</span></div><CardDescription>{completeness >= 80 ? "Ready for reliable matching" : "Complete more fields to improve matching"}</CardDescription></CardHeader><CardContent><Progress value={completeness} className="bg-[#e7ebf5] [&_[data-slot=progress-indicator]]:bg-[#5975d8]" /></CardContent></Card>
    </div>

    <Tabs defaultValue="identity" className="gap-5">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border bg-white p-1.5 sm:w-fit" variant="default">
        <TabsTrigger value="identity" className="px-4 py-2">Identity</TabsTrigger>
        <TabsTrigger value="preferences" className="px-4 py-2">Preferences</TabsTrigger>
        <TabsTrigger value="skills" className="px-4 py-2">Skills & evidence</TabsTrigger>
        <TabsTrigger value="resumes" className="px-4 py-2">CV Library <Badge variant="secondary" className="ml-1">{resumes.length}</Badge></TabsTrigger>
      </TabsList>

      <TabsContent value="identity" className="space-y-5">
        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle>Professional identity</CardTitle><CardDescription>The information employers and matching rules should rely on.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Full name"><Input value={profile.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Your full name" /></Field>
          <Field label="Professional headline"><Input value={profile.professionalHeadline} onChange={(event) => update("professionalHeadline", event.target.value)} placeholder="Backend software engineering student" /></Field>
          <Field label="Email"><Input type="email" value={profile.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" /></Field>
          <Field label="Phone"><Input value={profile.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+254…" /></Field>
          <Field label="Current location"><Input value={profile.location} onChange={(event) => update("location", event.target.value)} placeholder="Nairobi, Kenya" /></Field>
          <Field label="Availability"><Input value={profile.availability} onChange={(event) => update("availability", event.target.value)} placeholder="Flexible in 2027" /></Field>
          <Field label="Professional summary" wide><Textarea className="min-h-28" value={profile.summary} onChange={(event) => update("summary", event.target.value)} placeholder="Describe the engineering work you do best and the impact you want to create." /></Field>
        </CardContent></Card>

        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-5 text-[#5b72c7]" />Education</CardTitle><CardDescription>Used for graduation-window and student eligibility checks.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Institution"><Input value={profile.institution} onChange={(event) => update("institution", event.target.value)} placeholder="United States International University - Africa" /></Field>
          <Field label="Degree"><Input value={profile.degree} onChange={(event) => update("degree", event.target.value)} placeholder="BSc Software Engineering" /></Field>
          <Field label="Expected graduation"><Input value={profile.expectedGraduation} onChange={(event) => update("expectedGraduation", event.target.value)} placeholder="September 2027" /></Field>
        </CardContent></Card>

        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-[#5b72c7]" />Professional links</CardTitle></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="LinkedIn"><Input type="url" value={profile.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
          <Field label="GitHub"><Input type="url" value={profile.githubUrl} onChange={(event) => update("githubUrl", event.target.value)} placeholder="https://github.com/…" /></Field>
          <Field label="Portfolio"><Input type="url" value={profile.portfolioUrl} onChange={(event) => update("portfolioUrl", event.target.value)} placeholder="https://…" /></Field>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="preferences" className="space-y-5">
        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle>Role strategy</CardTitle><CardDescription>Backend is ranked first while strong Full-Stack roles remain eligible.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Primary track"><Select value={profile.primaryTrack} onValueChange={(value) => update("primaryTrack", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{tracks.map((track) => <SelectItem value={track} key={track}>{track}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Secondary track"><Select value={profile.secondaryTrack} onValueChange={(value) => update("secondaryTrack", value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{tracks.map((track) => <SelectItem value={track} key={track}>{track}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Target roles" hint="Separate roles with commas" wide><Input value={listToCsv(profile.targetRoles)} onChange={(event) => update("targetRoles", csvToList(event.target.value))} /></Field>
        </CardContent></Card>

        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle>Eligibility and location</CardTitle><CardDescription>Hard filters run before CV matching so ineligible jobs do not enter the Top 10.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Preferred locations" hint="Separate locations with commas"><Input value={listToCsv(profile.preferredLocations)} onChange={(event) => update("preferredLocations", csvToList(event.target.value))} /></Field>
          <Field label="Work authorization"><Input value={profile.workAuthorization} onChange={(event) => update("workAuthorization", event.target.value)} placeholder="Authorized to work in Kenya" /></Field>
          <Field label="Relocation preference"><Input value={profile.relocationPreference} onChange={(event) => update("relocationPreference", event.target.value)} placeholder="Only with sponsorship" /></Field>
          <Field label="Minimum compensation"><Input value={profile.minimumCompensation} onChange={(event) => update("minimumCompensation", event.target.value)} placeholder="Optional" /></Field>
          <Field label="Work modes" wide><div className="flex flex-wrap gap-3">{workModes.map((mode) => <label key={mode} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><Checkbox checked={profile.preferredWorkModes.includes(mode)} onCheckedChange={(checked) => update("preferredWorkModes", checked ? [...profile.preferredWorkModes, mode] : profile.preferredWorkModes.filter((item) => item !== mode))} />{mode}</label>)}</div></Field>
          <Field label="Preferred industries" hint="Separate industries with commas"><Input value={listToCsv(profile.industryPreferences)} onChange={(event) => update("industryPreferences", csvToList(event.target.value))} placeholder="SaaS, fintech, developer tools" /></Field>
          <Field label="Exclude when listing contains" hint="Separate terms with commas"><Input value={listToCsv(profile.excludedKeywords)} onChange={(event) => update("excludedKeywords", csvToList(event.target.value))} placeholder="Unpaid, commission only" /></Field>
          <div className="flex items-center gap-3 rounded-xl border bg-[#f7f9ff] p-4 md:col-span-2"><Checkbox id="reviewed" checked={profile.reviewed} onCheckedChange={(value) => update("reviewed", Boolean(value))} /><div><Label htmlFor="reviewed" className="cursor-pointer">I reviewed this profile</Label><p className="mt-1 text-xs text-muted-foreground">Mark this only after checking extracted and manually entered information.</p></div></div>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="skills" className="space-y-5">
        <Card className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle>Add verified evidence</CardTitle><CardDescription>Skills with project or experience evidence produce more trustworthy matches.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_180px_1.4fr_auto] md:items-end">
          <Field label="Skill"><Input value={newSkill.name} onChange={(event) => setNewSkill((current) => ({ ...current, name: event.target.value }))} placeholder="Node.js" /></Field>
          <Field label="Category"><Select value={newSkill.category} onValueChange={(value) => setNewSkill((current) => ({ ...current, category: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{skillCategories.map((category) => <SelectItem value={category} key={category}>{category}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Evidence"><Input value={newSkill.evidence} onChange={(event) => setNewSkill((current) => ({ ...current, evidence: event.target.value }))} placeholder="Used in Lumina API" /></Field>
          <Button type="button" onClick={addSkill} variant="outline"><Plus />Add</Button>
        </CardContent></Card>

        {profile.skills.length === 0 ? <Card className="border-dashed shadow-none"><CardContent className="flex min-h-52 flex-col items-center justify-center text-center"><Sparkles className="mb-3 size-8 text-[#8292c8]" /><h3 className="font-semibold">No skills reviewed yet</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Add skills manually or upload a CV and bring its detected skills here for review.</p></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{Object.entries(skillGroups).map(([category, skills]) => <Card key={category} className="border-[#e1e5ed] shadow-none"><CardHeader><CardTitle>{category}</CardTitle><CardDescription>{skills?.length || 0} verified or detected skills</CardDescription></CardHeader><CardContent className="space-y-3">{skills?.map((skill) => <div key={skill.name} className="flex items-start gap-3 rounded-xl border bg-[#fafbfe] p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{skill.name}</p><Badge variant="secondary" className={skill.verification === "inferred" ? "text-amber-700" : "text-emerald-700"}>{skill.verification}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{skill.evidence || "No evidence recorded yet"}</p></div><Button type="button" variant="ghost" size="icon-xs" onClick={() => removeSkill(skill.name)} aria-label={`Remove ${skill.name}`}><X /></Button></div>)}</CardContent></Card>)}</div>}
      </TabsContent>

      <TabsContent value="resumes" className="space-y-5">
        <Card className="border-[#dce4f7] bg-[linear-gradient(135deg,#ffffff_0%,#f5f8ff_100%)] shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-5 text-[#5670c9]" />Upload a CV version</CardTitle><CardDescription>PDF only, up to 3 MB. The file remains private and its text is analyzed for matching evidence.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1fr_180px_1.4fr_auto] lg:items-end">
          <Field label="Version label"><Input value={uploadLabel} onChange={(event) => setUploadLabel(event.target.value)} placeholder="Backend CV" /></Field>
          <Field label="Target track"><Select value={uploadTrack} onValueChange={setUploadTrack}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{tracks.map((track) => <SelectItem value={track} key={track}>{track}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="PDF file"><Input ref={fileInput} type="file" accept="application/pdf,.pdf" /></Field>
          <Button type="button" onClick={uploadResume} disabled={uploading} className="bg-[#5271df] hover:bg-[#4663c7]">{uploading ? <Loader2 className="animate-spin" /> : <Upload />}Analyze CV</Button>
        </CardContent></Card>

        {resumes.length === 0 ? <Card className="border-dashed shadow-none"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><FileText className="mb-4 size-9 text-[#8796c9]" /><h3 className="font-semibold">Your CV library is empty</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Start with your current Full-Stack CV, then add a Backend-focused version. The first upload becomes your primary CV.</p></CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{resumes.map((resume) => <Card key={resume.id} className={`shadow-none ${resume.isPrimary ? "border-[#9eafea] bg-[#f8faff]" : "border-[#e1e5ed]"}`}><CardHeader><div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e7edff] text-[#526bc2]"><FileText className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><CardTitle>{resume.label}</CardTitle>{resume.isPrimary && <Badge className="border-0 bg-[#dfe7ff] text-[#4059ad]"><Star />Primary</Badge>}</div><CardDescription className="mt-1">{resume.targetTrack} · Version {resume.version} · {formatBytes(resume.size)}</CardDescription></div></div></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{resume.status}</Badge><Badge variant="outline">Uploaded {formatUploaded(resume.uploadedAt)}</Badge></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detected skills</p>{resume.extractedSkills.length ? <div className="flex flex-wrap gap-1.5">{resume.extractedSkills.slice(0, 10).map((skill) => <Badge variant="secondary" key={skill.name}>{skill.name}</Badge>)}{resume.extractedSkills.length > 10 && <Badge variant="secondary">+{resume.extractedSkills.length - 10}</Badge>}</div> : <p className="text-sm text-muted-foreground">No recognized skills detected.</p>}</div><div className="flex flex-wrap gap-2 border-t pt-4"><Button type="button" size="sm" variant="outline" asChild><a href={`/api/resumes/${resume.id}`} target="_blank" rel="noreferrer"><Download />Open PDF</a></Button>{resume.extractedSkills.length > 0 && <Button type="button" size="sm" variant="outline" onClick={() => mergeResumeSkills(resume)}><Sparkles />Review skills</Button>}{!resume.isPrimary && <Button type="button" size="sm" variant="outline" onClick={() => updateResume(resume.id, { isPrimary: true })}><Star />Make primary</Button>}{resume.status !== "Verified" && <Button type="button" size="sm" variant="outline" onClick={() => updateResume(resume.id, { status: "Verified" })}><CheckCircle2 />Mark verified</Button>}<Button type="button" size="icon-sm" variant="ghost" className="ml-auto text-muted-foreground hover:bg-rose-50 hover:text-rose-600" onClick={() => deleteResume(resume)} aria-label={`Delete ${resume.label}`}><Trash2 /></Button></div></CardContent></Card>)}</div>}
      </TabsContent>
    </Tabs>
  </form>;
}
