import { InternshipTracker } from "./tracker";
import { isAuthenticated } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");
  return <InternshipTracker displayName={process.env.NEXT_PUBLIC_OWNER_NAME || "Shadrack"} />;
}
