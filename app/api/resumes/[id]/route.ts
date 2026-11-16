import { Readable } from "node:stream";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { openResumeDownload } from "@/lib/resume-storage";
import { isAuthenticated } from "@/lib/session";
import { Resume } from "@/models/Resume";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "CV not found." }, { status: 404 });
    await connectToDatabase();
    const resume = await Resume.findOne({ _id: id, ownerId: "owner" }).lean() as unknown as {
      gridFsFileId: mongoose.mongo.ObjectId;
      originalFileName: string;
    } | null;
    if (!resume) return Response.json({ error: "CV not found." }, { status: 404 });

    const stream = await openResumeDownload(resume.gridFsFileId);
    const safeName = resume.originalFileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The CV could not be opened." }, { status: 500 });
  }
}
