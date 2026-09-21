"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { Policy, PolicyRule } from "@/types";
import { ShieldAlert, Plus, Trash2, CheckCircle2, Sliders, AlertCircle, ExternalLink } from "lucide-react";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New policy form state
  const [newPolicyName, setNewPolicyName] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");
  const [rules, setRules] = useState<PolicyRule[]>([]);

  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      const data = await api.listPolicies();
      setPolicies(data);
    } catch {
      setPolicies([
        {
          id: 1,
          name: "Standard Enterprise Procurement Policy 2026",
          rules: [
            { name: "Limitation of Liability Cap", query: "limitation of liability cap aggregate liability", threshold: 0.8 },
            { name: "Governing Law (New York)", query: "governing law jurisdiction New York", threshold: 0.85 },
            { name: "Mutual Indemnification", query: "indemnify hold harmless mutual third party claims", threshold: 0.75 },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleAddRule = () => {
    if (!ruleName.trim() || !ruleQuery.trim()) return;
    setRules([...rules, { name: ruleName.trim(), query: ruleQuery.trim(), threshold: 0.8 }]);
    setRuleName("");
    setRuleQuery("");
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSavePolicy = async () => {
    if (!newPolicyName.trim() || rules.length === 0) return;
    try {
      const created = await api.createPolicy({ name: newPolicyName.trim(), rules });
      setPolicies([created, ...policies]);
    } catch {
      const fallback: Policy = {
        id: Date.now(),
        name: newPolicyName.trim(),
        rules: [...rules],
      };
      setPolicies([fallback, ...policies]);
    }
    setIsCreating(false);
    setNewPolicyName("");
    setRules([]);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deletePolicy(id);
      setPolicies(policies.filter((p) => p.id !== id));
    } catch {
      setPolicies(policies.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-foreground-secondary" />
              <span>Compliance Policy Management</span>
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Define covenants, semantic retrieval queries, and risk deviation rules for the LangGraph multi-agent engine
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/policies/new"
              prefetch={true}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground border border-border text-xs font-medium transition-colors shadow-xs"
            >
              <span>Full Builder</span>
              <ExternalLink className="w-3.5 h-3.5 text-foreground-secondary" />
            </Link>

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? "Close Builder" : "Create Policy"}</span>
            </button>
          </div>
        </div>

        {/* Create Policy Builder Drawer */}
        {isCreating && (
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xl animate-in fade-in duration-150">
            <h3 className="text-sm font-semibold text-foreground">Policy Specification Builder</h3>

            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium">Policy Name</label>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="e.g. SaaS Vendor Standard Covenants 2026"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
              />
            </div>

            {/* Rules Builder */}
            <div className="border border-border rounded-xl p-4 bg-surface-secondary space-y-3">
              <span className="text-xs font-medium text-foreground">Add Covenant Rules</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Rule Name (e.g. Mutual Indemnification)"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                />
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Semantic Vector Query (e.g. vendor agrees to defend hold harmless)"
                    value={ruleQuery}
                    onChange={(e) => setRuleQuery(e.target.value)}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3.5 py-2 rounded-lg bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Added Rules List */}
              {rules.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {rules.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-surface border border-border px-3 py-2 rounded-lg text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-medium text-foreground">{r.name}</span>
                        <span className="text-foreground-secondary font-mono text-[11px] ml-2 truncate">
                          query: "{r.query}"
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(i)}
                        className="text-foreground-muted hover:text-red-500 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-medium text-foreground-secondary hover:text-foreground hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={!newPolicyName.trim() || rules.length === 0}
                className="px-4 py-2 min-h-[36px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Save & Register Policy
              </button>
            </div>
          </div>
        )}

        {/* Existing Policies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs hover:border-border-highlight transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-foreground-secondary shrink-0" />
                    <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-secondary text-foreground-secondary border border-border shrink-0">
                      #{p.id}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-secondary">
                    {p.rules?.length || 0} Registered Covenants
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.rules?.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-surface-secondary border border-border rounded-lg text-xs space-y-1"
                      >
                        <div className="font-medium text-foreground truncate">{r.name}</div>
                        <div className="text-[11px] font-mono text-foreground-secondary truncate">
                          {r.query}
                        </div>
                        {r.threshold && (
                          <div className="text-[10px] font-mono text-foreground-muted pt-0.5">
                            threshold: ≥ {r.threshold}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
