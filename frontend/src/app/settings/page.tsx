"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useTheme } from "@/components/theme/ThemeProvider";
import { api } from "@/lib/api";
import { ModelProvider, UserSetting, OllamaModelTag } from "@/types";
import {
  Settings,
  Cpu,
  Key,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("openai");
  const [selectedLlm, setSelectedLlm] = useState<string>("");
  const [selectedEmbedding, setSelectedEmbedding] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [activeSetting, setActiveSetting] = useState<UserSetting | null>(null);

  // Ollama
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");
  const [ollamaModels, setOllamaModels] = useState<OllamaModelTag[]>([]);
  const [isOllamaLoading, setIsOllamaLoading] = useState<boolean>(false);
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [provRes, settingRes] = await Promise.all([
        api.getProviders(),
        api.getSettings(),
      ]);
      setProviders(provRes.providers || []);
      setActiveSetting(settingRes);

      if (settingRes) {
        setSelectedProviderId(settingRes.provider || "openai");
        setSelectedLlm(settingRes.selected_llm || "");
        setSelectedEmbedding(settingRes.selected_embedding || "");
        if (settingRes.ollama_base_url) {
          setOllamaUrl(settingRes.ollama_base_url);
        }
      }
    } catch {
      setProviders([
        {
          id: "openai",
          name: "OpenAI",
          requires_api_key: true,
          llm_models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
          embedding_models: ["text-embedding-3-small", "text-embedding-3-large"],
        },
        {
          id: "anthropic",
          name: "Anthropic",
          requires_api_key: true,
          llm_models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
          embedding_models: ["sentence-transformers/all-mpnet-base-v2"],
        },
        {
          id: "ollama",
          name: "Ollama (Local Server)",
          requires_api_key: false,
          llm_models: ["llama3.2", "mistral", "qwen2.5"],
          embedding_models: ["nomic-embed-text", "mxbai-embed-large"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await api.saveSettings({
        provider: selectedProviderId,
        selected_llm: selectedLlm,
        selected_embedding: selectedEmbedding,
        api_key: apiKey.trim() || undefined,
        ollama_base_url: selectedProviderId === "ollama" ? ollamaUrl.trim() : undefined,
      });
      setStatusMsg({ text: "AI Model configurations saved and encrypted.", type: "success" });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update settings", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const currentProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="pb-3 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Settings className="w-5 h-5 text-foreground-secondary" />
            <span>System & Model Configuration</span>
          </h1>
          <p className="text-xs text-foreground-secondary mt-0.5">
            Configure AI providers, encrypted credential vault, and interface display preferences
          </p>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl flex items-center space-x-2 text-xs ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Appearance & Theme Preference */}
        <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Interface Appearance & Theme</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                theme === "light"
                  ? "border-foreground bg-surface-secondary ring-1 ring-border-highlight shadow-sm"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="p-2 rounded-lg bg-surface border border-border text-amber-500 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Bright Mode (Light)</div>
                <div className="text-[11px] text-foreground-secondary mt-0.5">
                  High-contrast slate canvas with crisp typography, optimized for daytime reading.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                theme === "dark"
                  ? "border-foreground bg-surface-secondary ring-1 ring-border-highlight shadow-sm"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="p-2 rounded-lg bg-surface border border-border text-foreground shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Titanium & Zinc (Dark)</div>
                <div className="text-[11px] text-foreground-secondary mt-0.5">
                  Deep charcoal slate designed to eliminate eye strain during extensive contract audits.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* AI Provider Configuration Form */}
        <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-border">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">AI Model Provider Setup</h2>
          </div>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Active Provider
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  const p = providers.find((prov) => prov.id === e.target.value);
                  if (p?.llm_models && p.llm_models.length > 0) setSelectedLlm(p.llm_models[0]);
                  if (p?.embedding_models && p.embedding_models.length > 0) setSelectedEmbedding(p.embedding_models[0]);
                }}
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-border-highlight"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-foreground">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Models Dropdowns */}
            {currentProvider && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Auditor LLM Model
                  </label>
                  <select
                    value={selectedLlm}
                    onChange={(e) => setSelectedLlm(e.target.value)}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-border-highlight font-mono"
                  >
                    {currentProvider.llm_models.map((m) => (
                      <option key={m} value={m} className="bg-surface text-foreground">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Vector Embedding Model
                  </label>
                  <select
                    value={selectedEmbedding}
                    onChange={(e) => setSelectedEmbedding(e.target.value)}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-border-highlight font-mono"
                  >
                    {currentProvider.embedding_models.map((m) => (
                      <option key={m} value={m} className="bg-surface text-foreground">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* API Key */}
            {currentProvider?.requires_api_key && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  API Key (Stored with AES-256 GCM)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={activeSetting?.api_key_masked || "Enter API token..."}
                    className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-10 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-mono"
                  />
                  <Key className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Ollama URL */}
            {selectedProviderId === "ollama" && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Local Ollama Base URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-border-highlight"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 min-h-[38px] rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 disabled:opacity-50 shadow-xs"
            >
              {isSaving ? "Encrypting & Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
