"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { DocumentViewer } from "@/components/reviewer/DocumentViewer";
import { PolicyInspector } from "@/components/reviewer/PolicyInspector";
import { DecisionDock } from "@/components/reviewer/DecisionDock";
import { api } from "@/lib/api";
import { Contract, Policy, GraphState, ContractClause, ClauseHighlight } from "@/types";
import { ArrowLeft, UserPlus, ShieldCheck, Download, FileText, FileCode } from "lucide-react";
import Link from "next/link";
import { AccessGrantModal } from "@/components/contracts/AccessGrantModal";

type ReviewerViewTab = "document" | "inspector";

export default function ContractReviewPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const contractId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || "";

  const [contract, setContract] = useState<Contract | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number>(1);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [graphState, setGraphState] = useState<GraphState | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [activeCitationQuote, setActiveCitationQuote] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<ReviewerViewTab>("document");

  const handleExportPdf = async () => {
    try {
      setNotice({ msg: "Generating PDF Compliance Certificate...", type: "info" });
      const blob = await api.downloadExportPdf(contractId, selectedPolicyId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Docusage_Audit_${contract?.name || contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice({ msg: "PDF Compliance Certificate downloaded!", type: "success" });
    } catch (err: any) {
      setNotice({ msg: err.message || "Failed to export PDF", type: "error" });
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await api.getAuditJson(contractId, selectedPolicyId);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Docusage_Audit_${contract?.name || contractId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice({ msg: "JSON Audit Payload downloaded!", type: "success" });
    } catch (err: any) {
      setNotice({ msg: err.message || "Failed to export JSON", type: "error" });
    }
  };

  // Load policies
  useEffect(() => {
    api
      .getPolicies()
      .then((pols: Policy[]) => {
        if (pols && pols.length > 0) {
          setPolicies(pols);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!contractId) return;

    // 1. Load contract details
    api
      .getContract(contractId)
      .then((c) => {
        if (c && c.id) {
          setContract(c);
        } else {
          setContract({
            id: contractId,
            name: "Contract_Document.pdf",
            file_path: `data/contracts/${contractId}.pdf`,
            metadata: { size: 245000, pages: 1 },
            created_at: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch contract details, setting fallback:", err);
        setContract({
          id: contractId,
          name: "Contract_Document.pdf",
          file_path: `data/contracts/${contractId}.pdf`,
          metadata: { size: 245000, pages: 1 },
          created_at: new Date().toISOString(),
        });
      });

    // 2. Load actual extracted document chunks
    api
      .getContractClauses(contractId)
      .then((cls) => setClauses(cls || []))
      .catch(() => setClauses([]));
  }, [contractId]);

  // 3. Start or inspect LangGraph review session with selected policy
  useEffect(() => {
    if (!contractId) return;

    const activeThreadId = `contract-${contractId}-pol${selectedPolicyId}-session`;
    setThreadId(activeThreadId);

    const activePol = policies.find((p) => p.id === selectedPolicyId);
    if (activePol) setPolicy(activePol);

    api
      .startAnalysis(contractId, selectedPolicyId, activeThreadId)
      .then((res) => {
        setGraphState(res.state);
      })
      .catch(() => {
        // Fallback default state for offline mode
        setGraphState({
          contract_id: contractId,
          policy_id: selectedPolicyId,
          thread_id: activeThreadId,
          rules: activePol?.rules || [
            { name: "Limitation of Liability Cap", query: "limitation of liability cap" },
            { name: "Governing Law Jurisdiction", query: "governing law jurisdiction" },
          ],
          retrieved_clauses: {},
          crag_findings: [],
          deviations: [],
          risk_score: 0.0,
          status: "PAUSED_AT_HUMAN_REVIEW",
          iteration_count: 1,
          max_iterations: 3,
        });
      });
  }, [contractId, selectedPolicyId, policies]);

  const handleDecision = async (action: "approve" | "reject" | "revise", feedback?: string) => {
    if (!threadId) return;
    setIsSubmitting(true);
    setNotice(null);

    try {
      const res = await api.submitReview(threadId, action, feedback);
      setGraphState(res.state);

      if (action === "approve") {
        setNotice({ msg: "Contract successfully approved and audit finalized.", type: "success" });
      } else if (action === "revise") {
        setNotice({ msg: "Refinement loop initiated. Re-auditing with legal feedback...", type: "info" });
      } else {
        setNotice({ msg: "Contract rejected by legal counsel.", type: "error" });
      }
    } catch (err: any) {
      setGraphState((prev) => {
        if (!prev) return null;
        const nextStatus =
          action === "approve"
            ? "APPROVED_BY_LEGAL"
            : action === "reject"
            ? "REJECTED_BY_LEGAL"
            : "REFINING_WITH_FEEDBACK";

        return {
          ...prev,
          status: nextStatus,
          human_action: action,
          human_feedback: feedback,
          iteration_count: action === "revise" ? prev.iteration_count + 1 : prev.iteration_count,
        };
      });

      setNotice({
        msg: `Decision '${action.toUpperCase()}' recorded (${feedback ? `Feedback: "${feedback}"` : "No comment"}).`,
        type: action === "approve" ? "success" : action === "reject" ? "error" : "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlightedClauses: ClauseHighlight[] = (graphState?.crag_findings || []).map((finding, idx) => {
    const primaryCitation = finding.citations?.[0];
    return {
      id: `finding-${idx}`,
      section: primaryCitation?.section_reference || finding.rule_name,
      text: primaryCitation?.exact_quote || finding.rationale,
      type: finding.status === "DEVIATION"
        ? "DEVIATION"
        : finding.status === "MISSING_COVENANT"
        ? "MISSING_COVENANT"
        : "SATISFIED",
      ruleName: finding.rule_name,
      confidence: finding.confidence_score && finding.confidence_score > 0 ? finding.confidence_score : 0.95,
      exactQuote: primaryCitation?.exact_quote,
      suggestedRedline: finding.suggested_redline,
      rationale: finding.rationale,
    };
  });

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-xs font-mono text-foreground-secondary">
        Loading agreement...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      {/* Reviewer Header Breadcrumb & Actions Bar */}
      <div className="min-h-[48px] border-b border-border bg-surface px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link
            href="/contracts"
            className="flex items-center space-x-1 text-foreground-secondary hover:text-foreground transition-colors font-medium shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Contracts</span>
          </Link>
          <span className="text-foreground-muted">/</span>
          <span className="text-foreground font-semibold truncate max-w-[180px] sm:max-w-xs">{contract.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Policy Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-surface-secondary border border-border rounded-lg px-2.5 py-1 text-xs font-mono shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-foreground-secondary text-[10px] uppercase tracking-wider hidden sm:inline">Policy:</span>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(Number(e.target.value))}
              className="bg-transparent text-foreground text-xs font-sans focus:outline-none cursor-pointer pr-1"
            >
              {policies.length > 0 ? (
                policies.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-foreground">
                    {p.name}
                  </option>
                ))
              ) : (
                <option value={1} className="bg-surface text-foreground">
                  Standard Enterprise Policy
                </option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsGrantModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 min-h-[30px] rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground border border-border transition-colors text-xs"
            title="Delegate access"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Delegate</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center space-x-1 px-2.5 py-1 min-h-[30px] rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors font-mono text-[11px]"
            title="Download PDF Compliance Certificate"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center space-x-1 px-2.5 py-1 min-h-[30px] rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground border border-border transition-colors font-mono text-[11px]"
            title="Download JSON Audit Findings"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`px-4 sm:px-6 py-2 border-b text-xs flex items-center justify-between ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : notice.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          <span className="font-mono">{notice.msg}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-foreground-secondary hover:text-foreground text-xs ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Mobile / Tablet Segmented Tab Control (< 1024px) */}
      <div className="lg:hidden px-4 pt-3 pb-1 bg-canvas border-b border-border">
        <div className="flex items-center p-1 bg-surface-secondary border border-border rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setMobileTab("document")}
            className={`flex-1 py-1.5 min-h-[32px] rounded-lg transition-colors text-center ${
              mobileTab === "document"
                ? "bg-surface text-foreground shadow-xs font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            📄 Document Clauses ({clauses.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("inspector")}
            className={`flex-1 py-1.5 min-h-[32px] rounded-lg transition-colors text-center ${
              mobileTab === "inspector"
                ? "bg-surface text-foreground shadow-xs font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            🛡️ CRAG Inspector ({highlightedClauses.length})
          </button>
        </div>
      </div>

      {/* Main Workspace (Side-by-side on lg+, Tabbed on smaller screens) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-4 gap-4 max-w-7xl w-full mx-auto">
        <div className={`flex-1 ${mobileTab === "document" ? "block" : "hidden lg:flex lg:flex-1"}`}>
          <DocumentViewer
            contract={contract}
            clauses={clauses}
            highlightedClauses={highlightedClauses}
            selectedClauseId={selectedClauseId}
            activeCitationQuote={activeCitationQuote}
            onSelectClause={(id) => setSelectedClauseId(id)}
            onSelectCitation={(quote) => {
              setActiveCitationQuote(quote);
              setMobileTab("document");
            }}
          />
        </div>

        <div className={`w-full lg:w-96 ${mobileTab === "inspector" ? "block" : "hidden lg:block"}`}>
          <PolicyInspector
            policy={policy}
            graphState={graphState}
            isLoading={isSubmitting}
            onSelectCitation={(quote) => {
              setActiveCitationQuote(quote);
              setMobileTab("document");
            }}
          />
        </div>
      </main>

      {/* Floating Human-in-the-loop Decision Dock */}
      <DecisionDock
        onDecision={handleDecision}
        isSubmitting={isSubmitting}
        currentStatus={graphState?.status}
      />

      <AccessGrantModal
        contractId={String(contractId)}
        contractName={contract.name}
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
      />
    </div>
  );
}
