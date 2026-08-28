"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { Policy, PolicyRule } from "@/types";
import { ShieldAlert, Plus, Trash2, CheckCircle2, Sliders, AlertCircle } from "lucide-react";

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
      // Local fallback
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
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-zinc-400" />
              <span>Compliance Policy Management</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Define covenants, semantic retrieval queries, and risk deviation rules for the LangGraph multi-agent engine
            </p>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreating ? "Close Builder" : "Create Policy"}</span>
          </button>
        </div>

        {/* Create Policy Builder Drawer */}
        {isCreating && (
          <div className="bg-[#121214] border border-zinc-700/60 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in duration-150">
            <h3 className="text-sm font-semibold text-zinc-100">Policy Specification Builder</h3>
            
            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Policy Name</label>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="e.g. SaaS Vendor Standard Covenants 2026"
                className="w-full bg-[#18181b] border border-[#27272a] rounded px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Rules Builder */}
            <div className="border border-[#27272a] rounded-lg p-4 bg-[#151518] space-y-3">
              <span className="text-xs font-medium text-zinc-300">Add Covenant Rules</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Rule Name (e.g. Mutual Indemnification)"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Semantic Vector Query (e.g. vendor agrees to defend hold harmless)"
                    value={ruleQuery}
                    onChange={(e) => setRuleQuery(e.target.value)}
                    className="flex-1 bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    onClick={handleAddRule}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Added Rules List */}
              {rules.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {rules.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#18181b] border border-[#27272a] px-3 py-2 rounded text-xs">
                      <div>
                        <span className="font-medium text-zinc-200">{r.name}</span>
                        <span className="text-zinc-500 font-mono text-[11px] ml-2">query: "{r.query}"</span>
                      </div>
                      <button onClick={() => handleRemoveRule(i)} className="text-zinc-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={!newPolicyName.trim() || rules.length === 0}
                className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors disabled:opacity-50"
              >
                Save & Register Policy
              </button>
            </div>
          </div>
        )}

        {/* Existing Policies List */}
        <div className="space-y-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className="bg-[#121214] border border-[#27272a] rounded-xl p-5 space-y-3 shadow-sm hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">{p.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    ID: #{p.id}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Policy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  {p.rules?.length || 0} Registered Covenants
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {p.rules?.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-xs space-y-1"
                    >
                      <div className="font-medium text-zinc-200 truncate">{r.name}</div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">
                        {r.query}
                      </div>
                      {r.threshold && (
                        <div className="text-[10px] font-mono text-zinc-400 pt-0.5">
                          sim threshold: ≥ {r.threshold}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
