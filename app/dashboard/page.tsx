import { getUserLibraryAction } from "@/app/actions/library";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProDashboard from "@/components/ProDashboard";

export default async function DashboardRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const result = await getUserLibraryAction();
  const documents = result.success ? result.documents : [];

  return (
    <ProDashboard
      user={{ firstName: user?.firstName ?? null }}
      documents={documents}
    />
  );
}
