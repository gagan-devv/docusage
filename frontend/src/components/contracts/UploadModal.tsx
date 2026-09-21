"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileCheck, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      await api.uploadContract(file);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ingest New Legal Document</h3>
            <p className="text-xs text-foreground-secondary mt-0.5">PDF or DOCX contract to chunk, vectorize and audit</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 min-h-[32px] min-w-[32px] rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragOver
              ? "border-border-highlight bg-surface-secondary"
              : "border-border hover:border-border-highlight bg-surface-secondary/40 hover:bg-surface-secondary"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="p-3 rounded-full bg-surface border border-border text-foreground mb-3 shadow-xs">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">
              {uploading ? "Ingesting and generating vectors..." : "Click to browse or drop file here"}
            </p>
            <p className="text-[11px] text-foreground-secondary">
              Supports .pdf, .docx, .txt (Max 25MB)
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-medium text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
