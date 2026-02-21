import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import FlashcardsPage from "@/components/FlashcardsPage";

export default async function FlashcardsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <FlashcardsPage
      user={{ firstName: user?.firstName ?? null }}
    />
  );
}
