"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { PolicyRule } from "@/types";
import { ArrowLeft, ShieldAlert, Plus, Trash2, CheckCircle2, Sliders, Save } from "lucide-react";

export default function NewPolicyPage() {
  const router = useRouter();
  const [policyName, setPolicyName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<PolicyRule[]>([
    { name: "Limitation of Liability Cap", query: "limitation of liability cap aggregate liability", threshold: 0.8 },
    { name: "Governing Law & Jurisdiction", query: "governing law jurisdiction dispute resolution", threshold: 0.85 },
  ]);

  const [ruleName, setRuleName] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleThreshold, setRuleThreshold] = useState<number>(0.8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddRule = () => {
    if (!ruleName.trim() || !ruleQuery.trim()) return;
    setRules([...rules, { name: ruleName.trim(), query: ruleQuery.trim(), threshold: ruleThreshold }]);
    setRuleName("");
    setRuleQuery("");
    setRuleThreshold(0.8);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim()) {
      setErrorMsg("Please enter a policy name.");
      return;
    }
    if (rules.length === 0) {
      setErrorMsg("Please add at least one covenant rule.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createPolicy({ name: policyName.trim(), rules });
      router.push("/policies");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create policy. Saved locally.");
      setTimeout(() => {
        router.push("/policies");
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center space-x-3 pb-2 border-b border-border text-xs">
          <Link
            href="/policies"
            className="flex items-center space-x-1 text-foreground-secondary hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Policies</span>
          </Link>
          <span className="text-foreground-muted">/</span>
          <span className="text-foreground font-semibold">Policy Specification Builder</span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Policy Overview Card */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">General Policy Information</h2>
                <p className="text-xs text-foreground-secondary">
                  Specify name and scope for the automated legal compliance auditor
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Standard Cloud Procurement Covenants 2026"
                  required
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description / Context (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Governs third-party SaaS contracts, data protection addendums, and SLAs"
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-sans"
                />
              </div>
            </div>
          </div>

          {/* Covenant Rules Builder Card */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Compliance Covenants ({rules.length})</h2>
                <p className="text-xs text-foreground-secondary">
                  Configure semantic vector queries and similarity thresholds for clause retrieval
                </p>
              </div>
            </div>

            {/* Add Rule Form */}
            <div className="p-4 rounded-xl bg-surface-secondary border border-border space-y-3">
              <span className="text-xs font-semibold text-foreground">Add New Covenant</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-foreground-secondary mb-1">
                    Covenant Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mutual Indemnification"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground-secondary mb-1">
                    Semantic Retrieval Query
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vendor agrees to defend and indemnify customer from third-party IP claims"
                    value={ruleQuery}
                    onChange={(e) => setRuleQuery(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-[11px] font-medium text-foreground-secondary">
                    Cosine Similarity Threshold:
                  </span>
                  <span className="font-mono font-semibold text-foreground px-2 py-0.5 rounded bg-surface border border-border">
                    ≥ {ruleThreshold.toFixed(2)}
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(parseFloat(e.target.value))}
                    className="w-32 accent-foreground cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!ruleName.trim() || !ruleQuery.trim()}
                  className="inline-flex items-center justify-center space-x-1 px-3.5 py-2 rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Covenant</span>
                </button>
              </div>
            </div>

            {/* List of Rules */}
            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border bg-surface-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium text-foreground flex items-center space-x-2">
                      <span>{rule.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface text-foreground-secondary border border-border">
                        Threshold: ≥ {rule.threshold}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-foreground-secondary truncate">
                      query: "{rule.query}"
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-red-500 hover:bg-red-500/10 transition-colors self-end sm:self-auto"
                    title="Remove covenant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/policies"
              className="px-4 py-2 min-h-[38px] rounded-lg border border-border bg-surface hover:bg-surface-secondary text-foreground text-xs font-medium transition-colors flex items-center justify-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !policyName.trim() || rules.length === 0}
              className="inline-flex items-center space-x-2 px-5 py-2 min-h-[38px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Registering..." : "Save Policy"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
