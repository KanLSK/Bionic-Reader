import { getUserLibraryAction } from "@/app/actions/library";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LibraryPage from "@/components/LibraryPage";

export default async function LibraryRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const result = await getUserLibraryAction();
  const documents = result.success ? result.documents : [];

  return (
    <LibraryPage
      user={{ firstName: user?.firstName ?? null }}
      documents={documents}
    />
  );
}
