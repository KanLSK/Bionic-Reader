import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AnalyticsPage from "@/components/AnalyticsPage";

export default async function AnalyticsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <AnalyticsPage
      user={{ firstName: user?.firstName ?? null }}
    />
  );
}
