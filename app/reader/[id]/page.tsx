import { getPdfDocumentAction } from "@/app/actions/upload";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReaderContainer from "@/components/ReaderContainer";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const result  = await getPdfDocumentAction(id);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#090C12]">
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Document</h2>
          <p className="text-zinc-600 max-w-md mx-auto text-sm">
            {result.error ?? "The document could not be found or you don't have access."}
          </p>
        </div>
      </div>
    );
  }

  const doc = result.document;

  return (
    <ReaderContainer
      documentId={doc._id}
      rawText={doc.rawText}
      documentTitle={doc.filename}
      initialWordIndex={doc.currentWordIndex || 0}
    />
  );
}
