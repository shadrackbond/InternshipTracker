"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, BriefcaseBusiness, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in");
      window.location.href = "/";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in");
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] p-5"><div className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-[0_24px_70px_rgba(44,55,84,.10)] sm:p-9"><div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-[#e6edff] text-[#5271df]"><BriefcaseBusiness className="size-6" /></div><h1 className="text-3xl font-semibold tracking-[-0.035em]">Internship Tracker</h1><p className="mt-2 leading-7 text-muted-foreground">Your private workspace for applications, interviews, and offers.</p><form onSubmit={submit} className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="access-key">Access key</Label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="access-key" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} className="h-11 pl-10" placeholder="Enter your private key" autoFocus required /></div></div>{error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}<Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-[#5271df] hover:bg-[#4663c7]">{loading ? "Signing in…" : "Open workspace"}<ArrowRight /></Button></form></div></main>;
}
