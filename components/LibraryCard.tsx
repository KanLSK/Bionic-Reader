'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { deleteDocumentAction } from '@/app/actions/library';
import { useRouter } from 'next/navigation';

interface LibraryCardProps {
  doc: {
    _id: string;
    filename: string;
    uploadDate: string;
  };
}

export default function LibraryCard({ doc }: LibraryCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteDocumentAction(doc._id);
    if (result.success) {
      // Refresh server component data without full navigation
      router.refresh();
    } else {
      alert('Failed to delete: ' + result.error);
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
        {/* Thumbnail */}
        <div className="h-32 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900/50 flex flex-col items-center justify-center border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          <FileText className="w-12 h-12 text-blue-500 dark:text-indigo-400 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent z-0 opacity-50" />

          {/* Delete button — top-right corner, visible on hover */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            title="Delete document"
            className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="p-6 flex-grow flex flex-col justify-between">
          <div>
            <h3
              className="font-bold text-lg text-zinc-800 dark:text-zinc-100 mb-2 line-clamp-2"
              title={doc.filename}
            >
              {doc.filename}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Added {new Date(doc.uploadDate).toLocaleDateString()}
            </p>
          </div>

          <Link
            href={`/reader/${doc._id}`}
            className="mt-6 w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-center font-medium rounded-xl text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Read Document
          </Link>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete document?</h2>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">{doc.filename}</span> will be permanently removed. This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
