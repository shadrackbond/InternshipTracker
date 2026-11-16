import { InferSchemaType, Schema, model, models } from "mongoose";

const extractedSkillSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "Other", trim: true },
  verification: { type: String, default: "inferred" },
  evidence: { type: String, default: "Detected in CV" },
}, { _id: false });

const resumeSchema = new Schema({
  ownerId: { type: String, required: true, index: true },
  label: { type: String, required: true, trim: true },
  targetTrack: { type: String, required: true, trim: true },
  originalFileName: { type: String, required: true, trim: true },
  mimeType: { type: String, default: "application/pdf" },
  size: { type: Number, required: true },
  gridFsFileId: { type: Schema.Types.ObjectId, required: true },
  version: { type: Number, required: true },
  isPrimary: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ["Ready for review", "Verified"], default: "Ready for review" },
  extractedText: { type: String, default: "" },
  extractedSkills: { type: [extractedSkillSchema], default: [] },
  parserVersion: { type: String, default: "rules-v1" },
}, { timestamps: true });

resumeSchema.index({ ownerId: 1, createdAt: -1 });

export type ResumeDocument = InferSchemaType<typeof resumeSchema>;
export const Resume = models.Resume || model("Resume", resumeSchema);
