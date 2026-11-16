import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import type { ProfileSkill } from "@/lib/profile-types";

const skillDictionary: Record<string, { label: string; category: string }> = {
  javascript: { label: "JavaScript", category: "Languages" },
  typescript: { label: "TypeScript", category: "Languages" },
  python: { label: "Python", category: "Languages" },
  java: { label: "Java", category: "Languages" },
  sql: { label: "SQL", category: "Languages" },
  react: { label: "React", category: "Frontend" },
  "next.js": { label: "Next.js", category: "Frontend" },
  nextjs: { label: "Next.js", category: "Frontend" },
  tailwind: { label: "Tailwind CSS", category: "Frontend" },
  "node.js": { label: "Node.js", category: "Backend" },
  nodejs: { label: "Node.js", category: "Backend" },
  express: { label: "Express.js", category: "Backend" },
  django: { label: "Django", category: "Backend" },
  fastapi: { label: "FastAPI", category: "Backend" },
  nestjs: { label: "NestJS", category: "Backend" },
  "rest api": { label: "REST APIs", category: "Backend" },
  rest: { label: "REST APIs", category: "Backend" },
  postgresql: { label: "PostgreSQL", category: "Data" },
  mongodb: { label: "MongoDB", category: "Data" },
  prisma: { label: "Prisma", category: "Data" },
  docker: { label: "Docker", category: "Cloud & DevOps" },
  kubernetes: { label: "Kubernetes", category: "Cloud & DevOps" },
  "github actions": { label: "GitHub Actions", category: "Cloud & DevOps" },
  vercel: { label: "Vercel", category: "Cloud & DevOps" },
  railway: { label: "Railway", category: "Cloud & DevOps" },
  oauth: { label: "OAuth", category: "Security" },
  jwt: { label: "JWT", category: "Security" },
  gemini: { label: "Gemini API", category: "AI" },
  "llm": { label: "LLM application workflows", category: "AI" },
  git: { label: "Git", category: "Tools" },
  postman: { label: "Postman", category: "Tools" },
};

function containsSkill(text: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

export async function extractResumeText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.replace(/\u0000/g, "").trim();
  } finally {
    await parser.destroy();
  }
}

export function detectResumeSkills(text: string): ProfileSkill[] {
  const found = new Map<string, ProfileSkill>();
  for (const [token, skill] of Object.entries(skillDictionary)) {
    if (!containsSkill(text, token) || found.has(skill.label.toLowerCase())) continue;
    found.set(skill.label.toLowerCase(), {
      name: skill.label,
      category: skill.category,
      verification: "inferred",
      evidence: "Detected in uploaded CV",
    });
  }
  return [...found.values()].sort((left, right) =>
    left.category.localeCompare(right.category) || left.name.localeCompare(right.name),
  );
}
