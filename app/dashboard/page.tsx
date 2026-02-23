import { getUserLibraryAction } from "@/app/actions/library";
import { getProDashboardStatsAction } from "@/app/actions/analytics";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProDashboard from "@/components/ProDashboard";

export default async function DashboardRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const [libraryRes, statsRes] = await Promise.all([
    getUserLibraryAction(),
    getProDashboardStatsAction()
  ]);

  const documents = libraryRes.success ? libraryRes.documents : [];
  const stats = statsRes.success ? statsRes.stats : null;

  return (
    <ProDashboard
      user={{ firstName: user?.firstName ?? null }}
      documents={documents}
      stats={stats}
    />
  );
}
