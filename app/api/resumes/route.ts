import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { detectResumeSkills, extractResumeText } from "@/lib/resume-parser";
import { deleteResumeFile, storeResumeFile } from "@/lib/resume-storage";
import { isAuthenticated } from "@/lib/session";
import { Resume } from "@/models/Resume";

export const runtime = "nodejs";

const ownerId = "owner";
const maxFileSize = 3 * 1024 * 1024;
const allowedStatuses = new Set(["Ready for review", "Verified"]);

function cleanText(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function serialize(document: Record<string, unknown>) {
  const {
    _id, __v, ownerId: _ownerId, gridFsFileId: _gridFsFileId,
    extractedText: _extractedText, createdAt, updatedAt: _updatedAt, ...resume
  } = document;
  void __v; void _ownerId; void _gridFsFileId; void _extractedText; void _updatedAt;
  return {
    ...resume,
    id: String(_id),
    uploadedAt: createdAt instanceof Date ? createdAt.getTime() : new Date(String(createdAt)).getTime(),
  };
}

function errorResponse(error: unknown, message: string) {
  console.error(error);
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    const rows = await Resume.find({ ownerId }).sort({ isPrimary: -1, createdAt: -1 }).lean();
    return Response.json({ resumes: rows.map((row) => serialize(row as Record<string, unknown>)) });
  } catch (error) {
    return errorResponse(error, "Your CV library could not be loaded.");
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let storedFileId: Awaited<ReturnType<typeof storeResumeFile>> | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const label = cleanText(form.get("label")) || "CV";
    const targetTrack = cleanText(form.get("targetTrack")) || "General";
    if (!(file instanceof File)) return Response.json({ error: "Choose a PDF to upload." }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Only PDF CV files are supported." }, { status: 400 });
    }
    if (!file.size || file.size > maxFileSize) {
      return Response.json({ error: "The PDF must be smaller than 3 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return Response.json({ error: "This file does not appear to be a valid PDF." }, { status: 400 });
    }

    const text = await extractResumeText(buffer);
    if (!text) return Response.json({ error: "No readable text was found in this PDF." }, { status: 422 });
    const extractedSkills = detectResumeSkills(text);

    await connectToDatabase();
    const [existingCount, version] = await Promise.all([
      Resume.countDocuments({ ownerId }),
      Resume.countDocuments({ ownerId, targetTrack }).then((count) => count + 1),
    ]);
    storedFileId = await storeResumeFile(buffer, file.name, { ownerId, label, targetTrack });
    const resume = await Resume.create({
      ownerId,
      label,
      targetTrack,
      originalFileName: file.name,
      mimeType: "application/pdf",
      size: file.size,
      gridFsFileId: storedFileId,
      version,
      isPrimary: existingCount === 0,
      status: "Ready for review",
      extractedText: text.slice(0, 100_000),
      extractedSkills,
    });
    return Response.json({ resume: serialize(resume.toObject()) }, { status: 201 });
  } catch (error) {
    if (storedFileId) {
      try { await deleteResumeFile(storedFileId); } catch (cleanupError) { console.error(cleanupError); }
    }
    return errorResponse(error, "The CV could not be uploaded or analyzed.");
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = cleanText(body.id, 100);
    if (!id || !mongoose.isValidObjectId(id)) return Response.json({ error: "Valid CV record is required." }, { status: 400 });
    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    if (typeof body.label === "string") updates.label = cleanText(body.label) || "CV";
    if (typeof body.targetTrack === "string") updates.targetTrack = cleanText(body.targetTrack) || "General";
    if (typeof body.status === "string" && allowedStatuses.has(body.status)) updates.status = body.status;
    if (body.isPrimary === true) {
      await Resume.updateMany({ ownerId, _id: { $ne: id } }, { $set: { isPrimary: false } });
      updates.isPrimary = true;
    }

    const resume = await Resume.findOneAndUpdate({ _id: id, ownerId }, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!resume) return Response.json({ error: "CV not found." }, { status: 404 });
    return Response.json({ resume: serialize(resume as Record<string, unknown>) });
  } catch (error) {
    return errorResponse(error, "The CV could not be updated.");
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id || !mongoose.isValidObjectId(id)) return Response.json({ error: "Valid CV record is required." }, { status: 400 });
    await connectToDatabase();
    const resume = await Resume.findOneAndDelete({ _id: id, ownerId });
    if (!resume) return Response.json({ error: "CV not found." }, { status: 404 });
    try { await deleteResumeFile(resume.gridFsFileId); } catch (storageError) { console.error(storageError); }

    if (resume.isPrimary) {
      await Resume.findOneAndUpdate({ ownerId }, { $set: { isPrimary: true } }, { sort: { createdAt: -1 } });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error, "The CV could not be removed.");
  }
}
