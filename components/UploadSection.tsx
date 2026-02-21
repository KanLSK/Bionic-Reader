'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import { uploadPdfAction } from '@/app/actions/upload';

interface UploadSectionProps {
  onUploadSuccess: (documentId: string, s3Url: string, text: string) => void;
}

export default function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Using the Server Action Route
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await uploadRes.json();

      if (result.success && result.documentId) {
        // Fetch the parsed document from server to get text
        // For simplicity we can fetch the newly created document.
        const res = await fetch(`/api/document?id=${result.documentId}`);
        const data = await res.json();
        
        if (data.success && data.document) {
          onUploadSuccess(result.documentId, data.document.s3Url, data.document.rawText);
        } else {
          setError(data.error || 'Failed to retrieve parsed document.');
        }
      } else {
        setError(result.error || 'Failed to upload document.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Using the Server Action Route
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await uploadRes.json();

      if (result.success && result.documentId) {
        const res = await fetch(`/api/document?id=${result.documentId}`);
        const data = await res.json();
        
        if (data.success && data.document) {
          onUploadSuccess(result.documentId, data.document.s3Url, data.document.rawText);
        } else {
          setError(data.error || 'Failed to retrieve parsed document.');
        }
      } else {
        setError(result.error || 'Failed to upload document.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 mt-10 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl w-full max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 transition-all duration-300 hover:shadow-2xl">
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full">
        <FileText className="w-12 h-12 text-blue-500 dark:text-blue-400" />
      </div>
      
      <h2 className="2xl font-bold mb-2 text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">Upload your PDF</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-md">
        We&apos;ll extract the text and convert it to Bionic format to supercharge your reading speed.
      </p>

      <div 
        className="relative group cursor-pointer"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 transform group-hover:scale-105 ${
          isUploading ? 'bg-zinc-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30'
        }`}>
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Document...
            </>
          ) : (
            <>
              <UploadCloud className="w-5 h-5" />
              Select PDF File
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 w-full border border-red-100 dark:border-red-900/50">
          <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
