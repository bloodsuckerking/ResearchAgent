import { redirect } from "next/navigation";
import { getAuthMode, getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";
import "./login.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (getAuthMode() === "none") redirect("/");

  const admin = await getCurrentAdmin();
  if (admin) redirect("/");
  return <LoginForm />;
}
