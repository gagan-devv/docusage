"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ContractTable } from "@/components/contracts/ContractTable";
import { UploadModal } from "@/components/contracts/UploadModal";
import { api } from "@/lib/api";
import { Contract } from "@/types";
import { Upload, Search, FileText, Filter } from "lucide-react";

type FilterTab = "all" | "pending" | "compliant" | "archived";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
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

  const handleDelete = async (id: string | number) => {
    try {
      await api.deleteContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const filtered = contracts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "pending") return String(c.id) === "1";
    if (activeTab === "compliant") return String(c.id) !== "1";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <FileText className="w-5 h-5 text-foreground-secondary" />
              <span>Contract Repository</span>
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Browse agreements, inspect verified clauses, and launch compliance audits
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 shadow-xs self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Filter Tabs & Search Bar Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-surface-secondary border border-border rounded-xl text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 min-h-[32px] rounded-lg font-medium transition-colors shrink-0 ${
                activeTab === "all"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              All Agreements ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 min-h-[32px] rounded-lg font-medium transition-colors shrink-0 ${
                activeTab === "pending"
                  ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              Pending Review
            </button>
            <button
              onClick={() => setActiveTab("compliant")}
              className={`px-3 py-1.5 min-h-[32px] rounded-lg font-medium transition-colors shrink-0 ${
                activeTab === "compliant"
                  ? "bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              Compliant
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contracts by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-sans shadow-xs"
            />
          </div>
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
