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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272a] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Ingest New Legal Document</h3>
            <p className="text-xs text-zinc-400 mt-0.5">PDF or DOCX contract to chunk, vectorize and audit</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragOver
              ? "border-zinc-400 bg-zinc-800/40"
              : "border-[#27272a] hover:border-zinc-600 bg-[#151518]"
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

          {uploading ? (
            <div className="space-y-2 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-zinc-200 animate-spin" />
              <span className="text-xs text-zinc-300 font-mono">Parsing & Vectorizing Contract...</span>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <Upload className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Click to browse or drop file here
                </p>
                <p className="text-[11px] text-zinc-500 font-mono mt-1">
                  Supported formats: PDF, DOCX, TXT (up to 50MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272a]">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
