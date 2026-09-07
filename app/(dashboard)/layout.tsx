import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
