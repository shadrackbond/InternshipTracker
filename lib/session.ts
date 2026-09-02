import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "internship_tracker_session";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isSessionConfigured() {
  return Boolean(process.env.TRACKER_ACCESS_KEY && process.env.SESSION_SECRET);
}

export function createSessionToken() {
  const accessKey = process.env.TRACKER_ACCESS_KEY;
  const secret = process.env.SESSION_SECRET;
  if (!accessKey || !secret) throw new Error("Tracker authentication is not configured.");
  return createHmac("sha256", secret).update(`internship-tracker:${accessKey}`).digest("hex");
}

export function verifyAccessKey(candidate: string) {
  const expected = process.env.TRACKER_ACCESS_KEY;
  return Boolean(expected && safeEqual(candidate, expected));
}

export async function isAuthenticated() {
  if (!isSessionConfigured()) return false;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(value && safeEqual(value, createSessionToken()));
}
