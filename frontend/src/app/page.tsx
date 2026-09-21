"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { UploadModal } from "@/components/contracts/UploadModal";
import { api } from "@/lib/api";
import { Contract } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Upload,
  Shield,
  ArrowUpRight,
  FileText,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      <StatsBar
        totalContracts={contracts.length || 2}
        totalClauses={1420}
        avgCompliance={94.2}
        pendingReviews={1}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Urgent Action Required Banner */}
        <div className="bg-surface border border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                Action Required • Legal Review
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              Master_Services_Agreement_2026.pdf requires arbitration
            </h2>
            <p className="text-xs text-foreground-secondary">
              Deviations detected against Standard Enterprise Policy: Limitation of Liability cap uncapped.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
            <Link
              href="/contracts/1"
              prefetch={true}
              className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 min-h-[40px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 shadow-xs"
            >
              <Shield className="w-4 h-4" />
              <span>Launch Reviewer</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2-Column Responsive Cockpit: Action Queue & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Queue (2 Columns on Large Screens) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pending Legal Decisions</h3>
                <p className="text-xs text-foreground-secondary">Agreements flagged for counsel sign-off</p>
              </div>
              <Link
                href="/contracts"
                prefetch={true}
                className="text-xs font-medium text-foreground-secondary hover:text-foreground inline-flex items-center space-x-1"
              >
                <span>View all contracts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {contracts.slice(0, 3).map((c, idx) => (
                <div
                  key={c.id}
                  className="bg-surface border border-border hover:border-border-highlight rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors shadow-xs"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-secondary border border-border text-foreground-secondary shrink-0 mt-0.5 sm:mt-0">
                      <FileText className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-foreground-secondary font-mono flex items-center space-x-2 mt-0.5">
                        <span>{formatDate(c.created_at)}</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {idx === 0 ? "1 Deviation" : "Pending Audit"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/contracts/${c.id}`}
                    prefetch={true}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-xs font-medium text-foreground transition-colors"
                  >
                    <span>Audit Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & Ingestion Card (1 Column on Large Screens) */}
          <div className="space-y-3">
            <div className="pb-1">
              <h3 className="text-sm font-semibold text-foreground">Quick Ingest</h3>
              <p className="text-xs text-foreground-secondary">Upload documents for AI extraction</p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs">
              <div
                onClick={() => setIsUploadOpen(true)}
                className="border-2 border-dashed border-border hover:border-border-highlight rounded-xl p-6 text-center cursor-pointer transition-colors bg-surface-secondary/50 hover:bg-surface-secondary flex flex-col items-center justify-center space-y-2"
              >
                <div className="p-2.5 rounded-full bg-surface border border-border text-foreground">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">Click to upload or drag & drop</div>
                  <div className="text-[11px] text-foreground-secondary mt-0.5">PDF, DOCX, or TXT up to 25MB</div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <Link
                  href="/contracts"
                  prefetch={true}
                  className="w-full py-2 min-h-[38px] rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground font-medium flex items-center justify-center space-x-2 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-foreground-secondary" />
                  <span>Open Document Hub</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
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
