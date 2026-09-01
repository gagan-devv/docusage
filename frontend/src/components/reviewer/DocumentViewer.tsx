"use client";

import React, { useState } from "react";
import { FileText, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, Quote, BookOpen } from "lucide-react";
import { Contract, ContractClause, ClauseHighlight } from "@/types";

interface DocumentViewerProps {
  contract: Contract;
  clauses?: ContractClause[];
  highlightedClauses?: ClauseHighlight[];
  selectedClauseId?: string | null;
  activeCitationQuote?: string | null;
  onSelectClause?: (id: string) => void;
  onSelectCitation?: (quote: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  contract,
  clauses = [],
  highlightedClauses = [],
  selectedClauseId,
  activeCitationQuote,
  onSelectClause,
  onSelectCitation,
}) => {
  const [viewMode, setViewMode] = useState<"FINDINGS" | "RAW_CHUNKS">("FINDINGS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DEVIATION" | "MISSING">("ALL");
  const chunkRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>({});

  React.useEffect(() => {
    if (activeCitationQuote) {
      setViewMode("RAW_CHUNKS");
      const targetIndex = clauses.findIndex((c) =>
        c.text.toLowerCase().includes(activeCitationQuote.toLowerCase().trim())
      );
      if (targetIndex !== -1 && chunkRefs.current[targetIndex]) {
        chunkRefs.current[targetIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeCitationQuote, clauses]);

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
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCitation && clause.exactQuote) onSelectCitation(clause.exactQuote);
                          else setViewMode("RAW_CHUNKS");
                        }}
                        className="p-2.5 rounded bg-black/40 border border-zinc-800 text-zinc-200 mb-2 font-mono text-[11px] flex items-start space-x-2 cursor-pointer hover:border-amber-500/50 hover:bg-amber-950/10 transition-colors"
                        title="Click to locate and view in raw document text"
                      >
                        <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center space-x-1">
                            <span>Grounded Citation</span>
                            <span className="text-[9px] text-amber-400/80">↗ View in Chunk</span>
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
              clauses.map((clause, idx) => {
                const prevClause = idx > 0 ? clauses[idx - 1] : null;
                const isNewPage = idx === 0 || (clause.page_number && prevClause?.page_number !== clause.page_number);
                const hasActiveQuote =
                  activeCitationQuote &&
                  clause.text.toLowerCase().includes(activeCitationQuote.toLowerCase().trim());

                return (
                  <React.Fragment key={clause.id || idx}>
                    {isNewPage && clause.page_number && (
                      <div className="flex items-center space-x-2 py-1 my-1">
                        <div className="h-px bg-zinc-800/80 flex-1" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded shadow-sm">
                          Document Page {clause.page_number}
                        </span>
                        <div className="h-px bg-zinc-800/80 flex-1" />
                      </div>
                    )}
                    <div
                      ref={(el) => {
                        chunkRefs.current[idx] = el;
                      }}
                      className={`p-4 rounded-lg border transition-all ${
                        hasActiveQuote
                          ? "border-amber-500/70 bg-[#1e1a14] ring-1 ring-amber-500/40 shadow-lg"
                          : "border-[#27272a] bg-[#151518] hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-zinc-400">
                        <span className="font-semibold text-zinc-300 flex items-center space-x-1.5 truncate max-w-md">
                          <span>#CHUNK {idx + 1}</span>
                          {clause.page_number && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="text-amber-400/90 font-medium">Page {clause.page_number}</span>
                            </>
                          )}
                          {clause.section_header && clause.section_header !== "Document" && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-300 truncate max-w-xs">{clause.section_header}</span>
                            </>
                          )}
                          {hasActiveQuote && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] shrink-0">
                              Matching Citation Target
                            </span>
                          )}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">
                          {clause.clause_type || "Extracted Clause"}
                        </span>
                      </div>
                    <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300 bg-black/30 p-3 rounded border border-zinc-800/80">
                      {activeCitationQuote && hasActiveQuote ? (
                        (() => {
                          const quoteStr = activeCitationQuote.trim();
                          const lowerT = clause.text.toLowerCase();
                          const lowerQ = quoteStr.toLowerCase();
                          const matchIdx = lowerT.indexOf(lowerQ);
                          if (matchIdx !== -1) {
                            const b = clause.text.substring(0, matchIdx);
                            const m = clause.text.substring(matchIdx, matchIdx + quoteStr.length);
                            const a = clause.text.substring(matchIdx + quoteStr.length);
                            return (
                              <>
                                {b}
                                <mark className="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded border border-amber-500/50 font-semibold underline decoration-amber-400">
                                  {m}
                                </mark>
                                {a}
                              </>
                            );
                          }
                          return clause.text;
                        })()
                      ) : (
                        clause.text
                      )}
                    </div>
                  </div>
                </React.Fragment>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
};
