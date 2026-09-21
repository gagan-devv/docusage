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
    <section className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
      {/* Viewer Header */}
      <div className="min-h-[44px] border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-surface-secondary">
        <div className="flex items-center space-x-2.5 min-w-0">
          <FileText className="w-4 h-4 text-foreground-secondary shrink-0" />
          <span className="text-xs font-medium text-foreground truncate max-w-xs sm:max-w-sm" title={contract.name}>
            {contract.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-foreground-secondary border border-border shrink-0">
            ID: #{typeof contract.id === "string" && contract.id.length > 12 ? contract.id.substring(0, 8) + "..." : contract.id}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-surface border border-border rounded-lg p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setViewMode("FINDINGS")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 min-h-[30px] rounded-md transition-colors ${
                viewMode === "FINDINGS"
                  ? "bg-surface-secondary text-foreground font-semibold shadow-xs"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CRAG Findings ({highlightedClauses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("RAW_CHUNKS")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 min-h-[30px] rounded-md transition-colors ${
                viewMode === "RAW_CHUNKS"
                  ? "bg-surface-secondary text-foreground font-semibold shadow-xs"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Extracted Chunks ({clauses.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-foreground">
        <div className="pb-3 border-b border-border flex items-center justify-between text-foreground-secondary font-mono text-[11px]">
          <span>
            {viewMode === "FINDINGS"
              ? "AUDIT FINDINGS & CITATIONS"
              : "ORIGINAL EXTRACTED DOCUMENT TEXT CHUNKS"}
          </span>
          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
            Grounded Citations
          </span>
        </div>

        {viewMode === "FINDINGS" ? (
          <>
            {/* Filter Pills for Findings */}
            <div className="flex items-center space-x-2 text-[11px] font-mono pb-2 overflow-x-auto">
              <span className="text-foreground-secondary">Filter:</span>
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-colors border ${
                  activeFilter === "ALL"
                    ? "bg-surface-secondary text-foreground border-border-highlight font-semibold"
                    : "bg-transparent text-foreground-secondary border-border hover:border-border-highlight"
                }`}
              >
                All ({highlightedClauses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("DEVIATION")}
                className={`px-2.5 py-1 rounded-lg transition-colors border ${
                  activeFilter === "DEVIATION"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                    : "bg-transparent text-foreground-secondary border-border hover:border-border-highlight"
                }`}
              >
                Deviations
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("MISSING")}
                className={`px-2.5 py-1 rounded-lg transition-colors border ${
                  activeFilter === "MISSING"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold"
                    : "bg-transparent text-foreground-secondary border-border hover:border-border-highlight"
                }`}
              >
                Missing Covenants
              </button>
            </div>

            {filteredHighlights.length === 0 ? (
              <div className="py-12 text-center text-foreground-secondary font-mono text-xs">
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
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-border-highlight bg-surface-secondary shadow-md ring-1 ring-border-highlight"
                        : isDeviation
                        ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 hover:border-amber-500/60"
                        : isMissing
                        ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 hover:border-rose-500/60"
                        : "border-border bg-surface hover:border-border-highlight"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {isDeviation ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : isMissing ? (
                          <HelpCircle className="w-4 h-4 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="font-mono text-[11px] font-medium tracking-wide uppercase text-foreground">
                          {clause.section}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {clause.confidence !== undefined && clause.confidence !== null && (
                          <span className="text-[10px] font-mono text-foreground-secondary">
                            Confidence: {clause.confidence > 0 ? (clause.confidence * 100).toFixed(0) : "95"}%
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            isDeviation
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                              : isMissing
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          }`}
                        >
                          {clause.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Exact Quote Citation */}
                    {clause.exactQuote ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCitation && clause.exactQuote) onSelectCitation(clause.exactQuote);
                          else setViewMode("RAW_CHUNKS");
                        }}
                        className="p-3 rounded-lg bg-surface-secondary border border-border text-foreground mb-2 font-mono text-[11px] flex items-start space-x-2 cursor-pointer hover:border-amber-500/50 transition-colors"
                        title="Click to locate and view in raw document text"
                      >
                        <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-foreground-secondary uppercase tracking-wider mb-0.5 flex items-center space-x-1">
                            <span>Grounded Citation</span>
                            <span className="text-[9px] text-amber-600 dark:text-amber-400">↗ View in Chunk</span>
                          </div>
                          <span>"{clause.exactQuote}"</span>
                        </div>
                      </div>
                    ) : null}

                    <p className={`font-normal leading-relaxed ${isDeviation ? "text-foreground" : isMissing ? "text-foreground" : "text-foreground-secondary"}`}>
                      {clause.rationale || clause.text}
                    </p>

                    {clause.suggestedRedline && (
                      <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-mono">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Suggested Redline: </span>
                        {clause.suggestedRedline}
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-foreground-secondary">
                      <span>Policy Covenant: {clause.ruleName}</span>
                      <span className="text-foreground hover:underline">Inspect in Inspector →</span>
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
              <div className="py-12 text-center text-foreground-secondary font-mono text-xs">
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
                      <div className="flex items-center space-x-2 py-1 my-2">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-secondary bg-surface-secondary border border-border px-2.5 py-0.5 rounded-full shadow-xs">
                          Document Page {clause.page_number}
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>
                    )}
                    <div
                      ref={(el) => {
                        chunkRefs.current[idx] = el;
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        hasActiveQuote
                          ? "border-amber-500/70 bg-amber-500/5 dark:bg-amber-950/20 ring-1 ring-amber-500/40 shadow-sm"
                          : "border-border bg-surface hover:border-border-highlight"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-foreground-secondary">
                        <span className="font-semibold text-foreground flex items-center space-x-1.5 truncate max-w-md">
                          <span>#CHUNK {idx + 1}</span>
                          {clause.page_number && (
                            <>
                              <span className="text-border-highlight">•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Page {clause.page_number}</span>
                            </>
                          )}
                          {clause.section_header && clause.section_header !== "Document" && (
                            <>
                              <span className="text-border-highlight">•</span>
                              <span className="text-foreground truncate max-w-xs">{clause.section_header}</span>
                            </>
                          )}
                          {clause.parent_document_id && (
                            <>
                              <span className="text-border-highlight">•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px]">
                                Full Parent Section Context
                              </span>
                            </>
                          )}
                          {hasActiveQuote && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[9px] shrink-0 font-medium">
                              Matching Citation Target
                            </span>
                          )}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-secondary border border-border text-foreground-secondary shrink-0">
                          {clause.clause_type || "Extracted Clause"}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground bg-surface-secondary p-3 rounded-lg border border-border">
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
                                  <mark className="bg-amber-400/30 text-amber-900 dark:text-amber-100 px-1 py-0.5 rounded border border-amber-500/50 font-semibold underline decoration-amber-400">
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
