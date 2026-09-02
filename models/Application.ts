import { InferSchemaType, Schema, model, models } from "mongoose";

const applicationSchema = new Schema({
  ownerId: { type: String, required: true, index: true },
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  track: { type: String, default: "Full-Stack" },
  location: { type: String, default: "" },
  workMode: { type: String, default: "Remote" },
  applicationUrl: { type: String, default: "" },
  dateFound: { type: String, default: "" },
  deadline: { type: String, default: "" },
  dateApplied: { type: String, default: "" },
  status: { type: String, default: "Interested", index: true },
  priority: { type: String, default: "Medium" },
  nextAction: { type: String, default: "" },
  followUpDate: { type: String, default: "" },
  resumeVersion: { type: String, default: "" },
  coverLetterUrl: { type: String, default: "" },
  portfolioSubmitted: { type: Boolean, default: false },
  githubSubmitted: { type: Boolean, default: false },
  referral: { type: String, default: "" },
  contactPerson: { type: String, default: "" },
  contactInfo: { type: String, default: "" },
  notes: { type: String, default: "" },
  interviewDate: { type: String, default: "" },
  interviewStage: { type: String, default: "" },
  assessment: { type: String, default: "" },
  assessmentDeadline: { type: String, default: "" },
  interviewOutcome: { type: String, default: "" },
  compensation: { type: String, default: "" },
  duration: { type: String, default: "" },
  startDate: { type: String, default: "" },
  visaRelocation: { type: String, default: "" },
  offerDeadline: { type: String, default: "" },
}, { timestamps: true });

applicationSchema.index({ ownerId: 1, updatedAt: -1 });

export type ApplicationDocument = InferSchemaType<typeof applicationSchema>;
export const Application = models.Application || model("Application", applicationSchema);
