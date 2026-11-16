import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";

async function getBucket() {
  await connectToDatabase();
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB is not connected.");
  return new mongoose.mongo.GridFSBucket(database, { bucketName: "resumes" });
}

export async function storeResumeFile(buffer: Buffer, filename: string, metadata: Record<string, string>) {
  const bucket = await getBucket();
  return new Promise<mongoose.mongo.ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      contentType: "application/pdf",
      metadata,
    });
    stream.once("error", reject);
    stream.once("finish", () => resolve(stream.id));
    stream.end(buffer);
  });
}

export async function deleteResumeFile(id: mongoose.mongo.ObjectId) {
  const bucket = await getBucket();
  await bucket.delete(id);
}

export async function openResumeDownload(id: mongoose.mongo.ObjectId) {
  const bucket = await getBucket();
  return bucket.openDownloadStream(id);
}
