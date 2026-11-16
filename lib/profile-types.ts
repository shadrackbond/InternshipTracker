export type SkillVerification = "cv" | "user" | "github" | "inferred";

export type ProfileSkill = {
  name: string;
  category: string;
  verification: SkillVerification;
  evidence: string;
};

export type CandidateProfile = {
  id?: string;
  fullName: string;
  professionalHeadline: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  summary: string;
  institution: string;
  degree: string;
  expectedGraduation: string;
  primaryTrack: string;
  secondaryTrack: string;
  targetRoles: string[];
  preferredLocations: string[];
  preferredWorkModes: string[];
  availability: string;
  workAuthorization: string;
  relocationPreference: string;
  minimumCompensation: string;
  industryPreferences: string[];
  excludedKeywords: string[];
  skills: ProfileSkill[];
  reviewed: boolean;
  updatedAt?: number;
};

export type ResumeRecord = {
  id: string;
  label: string;
  targetTrack: string;
  originalFileName: string;
  size: number;
  version: number;
  isPrimary: boolean;
  status: "Ready for review" | "Verified";
  extractedSkills: ProfileSkill[];
  uploadedAt: number;
};

export const emptyCandidateProfile: CandidateProfile = {
  fullName: "",
  professionalHeadline: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  summary: "",
  institution: "",
  degree: "",
  expectedGraduation: "",
  primaryTrack: "Backend",
  secondaryTrack: "Full-Stack",
  targetRoles: ["Backend Engineering Intern", "Full-Stack Engineering Intern"],
  preferredLocations: ["Kenya", "Global remote"],
  preferredWorkModes: ["Remote", "Hybrid", "On-site"],
  availability: "Flexible in 2027",
  workAuthorization: "",
  relocationPreference: "",
  minimumCompensation: "",
  industryPreferences: [],
  excludedKeywords: [],
  skills: [],
  reviewed: false,
};
