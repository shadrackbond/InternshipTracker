import { InferSchemaType, Schema, model, models } from "mongoose";

const profileSkillSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "Other", trim: true },
  verification: {
    type: String,
    enum: ["cv", "user", "github", "inferred"],
    default: "user",
  },
  evidence: { type: String, default: "", trim: true },
}, { _id: false });

const candidateProfileSchema = new Schema({
  ownerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, default: "", trim: true },
  professionalHeadline: { type: String, default: "", trim: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true },
  location: { type: String, default: "", trim: true },
  linkedinUrl: { type: String, default: "", trim: true },
  githubUrl: { type: String, default: "", trim: true },
  portfolioUrl: { type: String, default: "", trim: true },
  summary: { type: String, default: "", trim: true },
  institution: { type: String, default: "", trim: true },
  degree: { type: String, default: "", trim: true },
  expectedGraduation: { type: String, default: "", trim: true },
  primaryTrack: { type: String, default: "Backend", trim: true },
  secondaryTrack: { type: String, default: "Full-Stack", trim: true },
  targetRoles: { type: [String], default: ["Backend Engineering Intern", "Full-Stack Engineering Intern"] },
  preferredLocations: { type: [String], default: ["Kenya", "Global remote"] },
  preferredWorkModes: { type: [String], default: ["Remote", "Hybrid", "On-site"] },
  availability: { type: String, default: "Flexible in 2027", trim: true },
  workAuthorization: { type: String, default: "", trim: true },
  relocationPreference: { type: String, default: "", trim: true },
  minimumCompensation: { type: String, default: "", trim: true },
  industryPreferences: { type: [String], default: [] },
  excludedKeywords: { type: [String], default: [] },
  skills: { type: [profileSkillSchema], default: [] },
  reviewed: { type: Boolean, default: false },
}, { timestamps: true });

export type CandidateProfileDocument = InferSchemaType<typeof candidateProfileSchema>;
export const CandidateProfile = models.CandidateProfile || model("CandidateProfile", candidateProfileSchema);
