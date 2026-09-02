import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, isSessionConfigured, SESSION_COOKIE, verifyAccessKey } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!isSessionConfigured()) {
    return NextResponse.json({ error: "Set TRACKER_ACCESS_KEY and SESSION_SECRET before signing in." }, { status: 500 });
  }

  const body = await request.json() as { accessKey?: string };
  if (!body.accessKey || !verifyAccessKey(body.accessKey)) {
    return NextResponse.json({ error: "Incorrect access key." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
