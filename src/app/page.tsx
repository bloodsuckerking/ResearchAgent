import { redirect } from "next/navigation";
import { getAuthMode, getCurrentAdmin } from "@/lib/auth";
import ResearchWorkspace from "./research-workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return <ResearchWorkspace admin={admin} authMode={getAuthMode()} />;
}
