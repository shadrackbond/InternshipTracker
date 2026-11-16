import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { emptyCandidateProfile, type ProfileSkill, type SkillVerification } from "@/lib/profile-types";
import { isAuthenticated } from "@/lib/session";
import { CandidateProfile } from "@/models/CandidateProfile";

const ownerId = "owner";
const verifications = new Set<SkillVerification>(["cv", "user", "github", "inferred"]);

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanList(value: unknown, limit = 30) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, 100)).filter(Boolean))].slice(0, limit);
}

function cleanSkills(value: unknown): ProfileSkill[] {
  if (!Array.isArray(value)) return [];
  const skills = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = cleanText(record.name, 80);
    if (!name) return [];
    const verification = cleanText(record.verification, 20) as SkillVerification;
    return [{
      name,
      category: cleanText(record.category, 60) || "Other",
      verification: verifications.has(verification) ? verification : "user" as const,
      evidence: cleanText(record.evidence, 240),
    }];
  });
  return [...new Map(skills.map((skill) => [skill.name.toLowerCase(), skill])).values()].slice(0, 100);
}

function cleanPayload(body: Record<string, unknown>) {
  return {
    fullName: cleanText(body.fullName, 120),
    professionalHeadline: cleanText(body.professionalHeadline, 160),
    email: cleanText(body.email, 180).toLowerCase(),
    phone: cleanText(body.phone, 50),
    location: cleanText(body.location, 120),
    linkedinUrl: cleanText(body.linkedinUrl, 500),
    githubUrl: cleanText(body.githubUrl, 500),
    portfolioUrl: cleanText(body.portfolioUrl, 500),
    summary: cleanText(body.summary, 1200),
    institution: cleanText(body.institution, 180),
    degree: cleanText(body.degree, 180),
    expectedGraduation: cleanText(body.expectedGraduation, 80),
    primaryTrack: cleanText(body.primaryTrack, 80) || "Backend",
    secondaryTrack: cleanText(body.secondaryTrack, 80) || "Full-Stack",
    targetRoles: cleanList(body.targetRoles),
    preferredLocations: cleanList(body.preferredLocations),
    preferredWorkModes: cleanList(body.preferredWorkModes, 10),
    availability: cleanText(body.availability, 180),
    workAuthorization: cleanText(body.workAuthorization, 240),
    relocationPreference: cleanText(body.relocationPreference, 240),
    minimumCompensation: cleanText(body.minimumCompensation, 120),
    industryPreferences: cleanList(body.industryPreferences),
    excludedKeywords: cleanList(body.excludedKeywords),
    skills: cleanSkills(body.skills),
    reviewed: Boolean(body.reviewed),
  };
}

function serialize(document: Record<string, unknown>) {
  const { _id, __v, ownerId: _ownerId, createdAt: _createdAt, updatedAt, ...profile } = document;
  void __v; void _ownerId; void _createdAt;
  return {
    ...emptyCandidateProfile,
    ...profile,
    id: String(_id),
    updatedAt: updatedAt instanceof Date ? updatedAt.getTime() : new Date(String(updatedAt)).getTime(),
  };
}

export async function GET() {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    const profile = await CandidateProfile.findOne({ ownerId }).lean();
    return Response.json({ profile: profile ? serialize(profile as Record<string, unknown>) : emptyCandidateProfile });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The candidate profile could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const values = cleanPayload(await request.json() as Record<string, unknown>);
    await connectToDatabase();
    const profile = await CandidateProfile.findOneAndUpdate(
      { ownerId },
      { $set: values, $setOnInsert: { ownerId } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    return Response.json({ profile: serialize(profile as Record<string, unknown>) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The candidate profile could not be saved." }, { status: 500 });
  }
}
