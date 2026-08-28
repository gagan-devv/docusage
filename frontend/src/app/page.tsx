"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ContractTable } from "@/components/contracts/ContractTable";
import { UploadModal } from "@/components/contracts/UploadModal";
import { api } from "@/lib/api";
import { Contract } from "@/types";
import { Upload, Shield, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.listContracts(0, 10);
      setContracts(data);
    } catch {
      // Fallback sample contracts if backend is offline
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
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />
      
      <StatsBar
        totalContracts={contracts.length || 2}
        totalClauses={1420}
        avgCompliance={94.2}
        pendingReviews={1}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Quick Review Banner */}
        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="font-mono text-xs uppercase tracking-wider text-amber-300 font-medium">
                Action Required • LangGraph Human Review
              </span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Master_Services_Agreement_2026.pdf requires legal arbitration
            </h2>
            <p className="text-xs text-zinc-400">
              Deviations detected against Standard Enterprise Policy: Limitation of Liability uncapped for breach.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Link
              href="/contracts/1"
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Launch Reviewer</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Recent Contracts</h3>
            <p className="text-xs text-zinc-500">Indexed agreements stored with pgvector embeddings</p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#18181b] hover:bg-[#222227] text-zinc-200 border border-[#27272a] hover:border-zinc-500 text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Document</span>
          </button>
        </div>

        {/* Contracts Table */}
        <ContractTable
          contracts={contracts}
          isLoading={isLoading}
          onDeleteContract={handleDelete}
        />
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadData}
      />
    </div>
  );
}
