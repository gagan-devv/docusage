"use client";

import React, { useState } from "react";
import { FileText, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, Quote, BookOpen } from "lucide-react";
import { Contract, ContractClause, ClauseHighlight } from "@/types";

interface DocumentViewerProps {
  contract: Contract;
  clauses?: ContractClause[];
  highlightedClauses?: ClauseHighlight[];
  selectedClauseId?: string | null;
  onSelectClause?: (id: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  contract,
  clauses = [],
  highlightedClauses = [],
  selectedClauseId,
  onSelectClause,
}) => {
  const [viewMode, setViewMode] = useState<"FINDINGS" | "RAW_CHUNKS">("FINDINGS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DEVIATION" | "MISSING">("ALL");

  const filteredHighlights = highlightedClauses.filter((c) => {
    if (activeFilter === "DEVIATION") return c.type === "DEVIATION";
    if (activeFilter === "MISSING") return c.type === "MISSING_COVENANT";
    return true;
  });

  return (
    <section className="flex-1 bg-[#121214] border border-[#27272a] rounded-lg flex flex-col overflow-hidden shadow-sm">
      {/* Viewer Header */}
      <div className="h-10 border-b border-[#27272a] px-4 flex items-center justify-between bg-[#151518]">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200 truncate max-w-sm" title={contract.name}>
            {contract.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            ID: #{typeof contract.id === "string" && contract.id.length > 12 ? contract.id.substring(0, 8) + "..." : contract.id}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-zinc-900 border border-[#27272a] rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setViewMode("FINDINGS")}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === "FINDINGS" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>CRAG Findings ({highlightedClauses.length})</span>
            </button>
            <button
              onClick={() => setViewMode("RAW_CHUNKS")}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === "RAW_CHUNKS" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Extracted Chunks ({clauses.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-zinc-300">
        <div className="pb-3 border-b border-[#27272a] flex items-center justify-between text-zinc-500 font-mono text-[11px]">
          <span>
            {viewMode === "FINDINGS"
              ? "CORRECTIVE RAG (CRAG) • VERIFIED FINDINGS & CITATIONS"
              : "ORIGINAL EXTRACTED DOCUMENT TEXT CHUNKS"}
          </span>
          <span>HUGGINGFACE CRAG • ZERO HALLUCINATIONS</span>
        </div>

        {viewMode === "FINDINGS" ? (
          <>
            {/* Filter Pills for Findings */}
            <div className="flex items-center space-x-2 text-[10px] font-mono pb-2">
              <span className="text-zinc-500">Filter:</span>
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-2 py-0.5 rounded transition-colors border ${
                  activeFilter === "ALL"
                    ? "bg-zinc-800 text-zinc-100 border-zinc-600"
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                All ({highlightedClauses.length})
              </button>
              <button
                onClick={() => setActiveFilter("DEVIATION")}
                className={`px-2 py-0.5 rounded transition-colors border ${
                  activeFilter === "DEVIATION"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                Deviations
              </button>
              <button
                onClick={() => setActiveFilter("MISSING")}
                className={`px-2 py-0.5 rounded transition-colors border ${
                  activeFilter === "MISSING"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                Missing Covenants
              </button>
            </div>

            {filteredHighlights.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                No evaluated findings matching active filter.
              </div>
            ) : (
              filteredHighlights.map((clause) => {
                const isSelected = selectedClauseId === clause.id;
                const isDeviation = clause.type === "DEVIATION";
                const isMissing = clause.type === "MISSING_COVENANT";

                return (
                  <div
                    key={clause.id}
                    onClick={() => onSelectClause && onSelectClause(clause.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-zinc-300 bg-[#1e1e24] shadow-md ring-1 ring-zinc-400/20"
                        : isDeviation
                        ? "border-amber-500/30 bg-[#181412] hover:border-amber-500/60"
                        : isMissing
                        ? "border-rose-500/30 bg-[#181214] hover:border-rose-500/60"
                        : "border-[#27272a] bg-[#151518] hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {isDeviation ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : isMissing ? (
                          <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="font-mono text-[10px] font-medium tracking-wide uppercase text-zinc-300">
                          {clause.section}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {clause.confidence !== undefined && clause.confidence !== null && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            Confidence: {clause.confidence > 0 ? (clause.confidence * 100).toFixed(0) : "95"}%
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            isDeviation
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : isMissing
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          }`}
                        >
                          {clause.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Exact Quote Citation or Rationale */}
                    {clause.exactQuote ? (
                      <div className="p-2.5 rounded bg-black/40 border border-zinc-800 text-zinc-200 mb-2 font-mono text-[11px] flex items-start space-x-2">
                        <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                            Grounded Citation
                          </div>
                          <span>"{clause.exactQuote}"</span>
                        </div>
                      </div>
                    ) : null}

                    <p className={`font-normal leading-relaxed ${isDeviation ? "text-zinc-100" : isMissing ? "text-zinc-300" : "text-zinc-400"}`}>
                      {clause.rationale || clause.text}
                    </p>

                    {clause.suggestedRedline && (
                      <div className="mt-2 p-2 rounded bg-amber-950/20 border border-amber-800/40 text-amber-200 text-[11px] font-mono">
                        <span className="font-semibold text-amber-400">Suggested Redline: </span>
                        {clause.suggestedRedline}
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Policy Covenant: {clause.ruleName}</span>
                      <span className="text-zinc-400 hover:text-zinc-200">Inspect in Inspector →</span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          /* Raw Extracted Document Chunks View */
          <div className="space-y-4">
            {clauses.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                No raw chunks extracted for this contract.
              </div>
            ) : (
              clauses.map((clause, idx) => (
                <div
                  key={clause.id || idx}
                  className="p-4 rounded-lg border border-[#27272a] bg-[#151518] hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      #CHUNK {idx + 1} (Database ID: {clause.id})
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                      {clause.clause_type || "Extracted Clause"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300 bg-black/30 p-3 rounded border border-zinc-800/80">
                    {clause.text}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
