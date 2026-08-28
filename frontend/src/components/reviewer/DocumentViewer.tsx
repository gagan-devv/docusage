"use client";

import React, { useState } from "react";
import { FileText, Eye, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Contract } from "@/types";

interface ClauseHighlight {
  id: string;
  section: string;
  text: string;
  type: "DEVIATION" | "SATISFIED" | "INFO";
  ruleName: string;
  similarity?: number;
}

interface DocumentViewerProps {
  contract: Contract;
  highlightedClauses?: ClauseHighlight[];
  selectedClauseId?: string | null;
  onSelectClause?: (id: string) => void;
}

const DEFAULT_SAMPLE_CLAUSES: ClauseHighlight[] = [
  {
    id: "clause-indemnity",
    section: "Section 8.1 - Indemnification Scope",
    text: "The Vendor agrees to indemnify, defend, and hold harmless the Customer, its affiliates, officers, directors, and employees from and against any third-party claims arising from gross negligence or willful misconduct.",
    type: "SATISFIED",
    ruleName: "Standard Mutual Indemnification",
    similarity: 0.94,
  },
  {
    id: "clause-liability",
    section: "Section 8.2 - Limitation of Liability",
    text: "Neither party shall be liable for indirect, incidental, or consequential damages. Notwithstanding the foregoing, the total aggregate liability of Vendor under this Agreement shall be uncapped for data breaches.",
    type: "DEVIATION",
    ruleName: "Limitation of Liability Cap (<= 2x Fees)",
    similarity: 0.88,
  },
  {
    id: "clause-law",
    section: "Section 14.1 - Governing Law & Venue",
    text: "This Agreement shall be governed by, and construed in accordance with, the laws of the State of New York, without regard to conflict of law principles. Each party irrevocably submits to the exclusive jurisdiction of the state and federal courts located in New York County.",
    type: "SATISFIED",
    ruleName: "Governing Law (New York / Delaware)",
    similarity: 0.96,
  },
];

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  contract,
  highlightedClauses = DEFAULT_SAMPLE_CLAUSES,
  selectedClauseId,
  onSelectClause,
}) => {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DEVIATION">("ALL");

  const filteredClauses = activeFilter === "DEVIATION" 
    ? highlightedClauses.filter(c => c.type === "DEVIATION")
    : highlightedClauses;

  return (
    <section className="flex-1 bg-[#121214] border border-[#27272a] rounded-lg flex flex-col overflow-hidden shadow-sm">
      {/* Viewer Header */}
      <div className="h-10 border-b border-[#27272a] px-4 flex items-center justify-between bg-[#151518]">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200 truncate max-w-sm">
            {contract.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            ID: #{contract.id}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-zinc-900 border border-[#27272a] rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === "ALL" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All Clauses
            </button>
            <button
              onClick={() => setActiveFilter("DEVIATION")}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === "DEVIATION" ? "bg-amber-500/20 text-amber-300" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Flagged Only
            </button>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {highlightedClauses.length} Indexed
          </span>
        </div>
      </div>

      {/* Clauses Body */}
      <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed text-zinc-300">
        <div className="pb-3 border-b border-[#27272a] flex items-center justify-between text-zinc-500 font-mono text-[11px]">
          <span>MASTER SERVICES AGREEMENT • EXTRACTED CLAUSES</span>
          <span>EMBEDDINGS: PGVECTOR COSINE SIMILARITY</span>
        </div>

        {filteredClauses.map((clause) => {
          const isSelected = selectedClauseId === clause.id;
          const isDeviation = clause.type === "DEVIATION";

          return (
            <div
              key={clause.id}
              onClick={() => onSelectClause && onSelectClause(clause.id)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-zinc-300 bg-[#1e1e24] shadow-md ring-1 ring-zinc-400/20"
                  : isDeviation
                  ? "border-amber-500/30 bg-[#161412] hover:border-amber-500/60"
                  : "border-[#27272a] bg-[#151518] hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  {isDeviation ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span className="font-mono text-[10px] font-medium tracking-wide uppercase text-zinc-300">
                    {clause.section}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {clause.similarity && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      sim: {clause.similarity.toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isDeviation
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {isDeviation ? "Deviation" : "Conforming"}
                  </span>
                </div>
              </div>

              <p className={`font-normal leading-relaxed ${isDeviation ? "text-zinc-100" : "text-zinc-400"}`}>
                "{clause.text}"
              </p>

              <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Matched Policy Rule: {clause.ruleName}</span>
                <span className="text-zinc-400 hover:text-zinc-200">Inspect Rule →</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
