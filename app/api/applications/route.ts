import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isAuthenticated } from "@/lib/session";
import { Application } from "@/models/Application";

const editableFields = [
  "company", "role", "track", "location", "workMode", "applicationUrl",
  "dateFound", "deadline", "dateApplied", "status", "priority", "nextAction",
  "followUpDate", "resumeVersion", "coverLetterUrl", "portfolioSubmitted",
  "githubSubmitted", "referral", "contactPerson", "contactInfo", "notes",
  "interviewDate", "interviewStage", "assessment", "assessmentDeadline",
  "interviewOutcome", "compensation", "duration", "startDate", "visaRelocation",
  "offerDeadline",
] as const;

function cleanPayload(payload: Record<string, unknown>) {
  const values: Record<string, string | boolean> = {};
  for (const field of editableFields) {
    const value = payload[field];
    values[field] = field === "portfolioSubmitted" || field === "githubSubmitted"
      ? Boolean(value)
      : typeof value === "string" ? value.trim() : "";
  }
  return values;
}

function serialize(document: Record<string, unknown>) {
  const { _id, __v, createdAt, updatedAt, ...rest } = document;
  void __v;
  return {
    ...rest,
    id: String(_id),
    createdAt: createdAt instanceof Date ? createdAt.getTime() : new Date(String(createdAt)).getTime(),
    updatedAt: updatedAt instanceof Date ? updatedAt.getTime() : new Date(String(updatedAt)).getTime(),
  };
}

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json({ error: "The database request could not be completed." }, { status: 500 });
}

export async function GET() {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    const rows = await Application.find({ ownerId: "owner" }).sort({ updatedAt: -1 }).lean();
    return Response.json({ applications: rows.map((row) => serialize(row as Record<string, unknown>)) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const values = cleanPayload(await request.json());
    if (!values.company || !values.role) return Response.json({ error: "Company and role are required" }, { status: 400 });
    await connectToDatabase();
    const application = await Application.create({ ownerId: "owner", ...values });
    return Response.json({ application: serialize(application.toObject()) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const values = cleanPayload(body);
    if (!id || !values.company || !values.role) return Response.json({ error: "Application, company, and role are required" }, { status: 400 });
    await connectToDatabase();
    const application = await Application.findOneAndUpdate({ _id: id, ownerId: "owner" }, values, { new: true, runValidators: true }).lean();
    if (!application) return Response.json({ error: "Application not found" }, { status: 404 });
    return Response.json({ application: serialize(application as Record<string, unknown>) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Application is required" }, { status: 400 });
    await connectToDatabase();
    const application = await Application.findOneAndDelete({ _id: id, ownerId: "owner" });
    if (!application) return Response.json({ error: "Application not found" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
