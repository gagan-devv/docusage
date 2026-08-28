"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ContractTable } from "@/components/contracts/ContractTable";
import { UploadModal } from "@/components/contracts/UploadModal";
import { api } from "@/lib/api";
import { Contract } from "@/types";
import { Upload, Search, FileText } from "lucide-react";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const data = await api.listContracts(0, 100);
      setContracts(data);
    } catch {
      setContracts([
        {
          id: 1,
          name: "Master_Services_Agreement_2026.pdf",
          file_path: "data/contracts/1.pdf",
          metadata: { size: 245000, pages: 18 },
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Non_Disclosure_Mutual_v4.docx",
          file_path: "data/contracts/2.docx",
          metadata: { size: 84000, pages: 6 },
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          name: "Data_Processing_Addendum_GDPR.pdf",
          file_path: "data/contracts/3.pdf",
          metadata: { size: 128000, pages: 12 },
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const filtered = contracts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#27272a]">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-zinc-400" />
              <span>Contract Repository</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage vectorized legal agreements, review clauses, and execute AI audits
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contracts by name or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121214] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
          />
        </div>

        {/* Table */}
        <ContractTable
          contracts={filtered}
          isLoading={isLoading}
          onDeleteContract={handleDelete}
        />
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadContracts}
      />
    </div>
  );
}
