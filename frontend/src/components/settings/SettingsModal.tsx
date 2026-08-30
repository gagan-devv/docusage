"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Key, Cpu, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { ModelProvider, UserSetting, OllamaModelTag } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("openai");
  const [selectedLlm, setSelectedLlm] = useState<string>("");
  const [selectedEmbedding, setSelectedEmbedding] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [activeSetting, setActiveSetting] = useState<UserSetting | null>(null);
  
  // Ollama specific state
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
    } catch (e) {
      // Fallback baseline providers if API unconfigured
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
          id: "gemini",
          name: "Google Gemini",
          requires_api_key: true,
          llm_models: ["gemini-1.5-pro", "gemini-1.5-flash"],
          embedding_models: ["models/embedding-001"],
        },
        {
          id: "ollama",
          name: "Ollama (Local)",
          requires_api_key: false,
          llm_models: ["llama3.2", "mistral", "qwen2.5"],
          embedding_models: ["nomic-embed-text", "mxbai-embed-large"],
        },
        {
          id: "local",
          name: "SentenceTransformers (Offline Baseline)",
          requires_api_key: false,
          llm_models: ["rule-based-auditor"],
          embedding_models: ["sentence-transformers/all-mpnet-base-v2"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOllamaTags = async (targetUrl?: string) => {
    setIsOllamaLoading(true);
    try {
      const res = await api.getOllamaModels(targetUrl || ollamaUrl);
      setOllamaConnected(res.connected);
      setOllamaModels(res.models || []);
      if (res.models && res.models.length > 0 && selectedProviderId === "ollama") {
        if (!selectedLlm || !res.models.some(m => m.name === selectedLlm)) {
          setSelectedLlm(res.models[0].name);
        }
      }
    } catch {
      setOllamaConnected(false);
      setOllamaModels([]);
    } finally {
      setIsOllamaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProviderId === "ollama") {
      loadOllamaTags();
    } else {
      const currentProv = providers.find((p) => p.id === selectedProviderId);
      if (currentProv) {
        if (!currentProv.llm_models.includes(selectedLlm)) {
          setSelectedLlm(currentProv.llm_models[0] || "");
        }
        if (!currentProv.embedding_models.includes(selectedEmbedding)) {
          setSelectedEmbedding(currentProv.embedding_models[0] || "");
        }
      }
    }
  }, [selectedProviderId]);

  if (!isOpen) return null;

  const currentProvider = providers.find((p) => p.id === selectedProviderId);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const updated = await api.saveSettings({
        provider: selectedProviderId,
        selected_llm: selectedLlm,
        selected_embedding: selectedEmbedding,
        api_key: apiKey.trim() || undefined,
        ollama_base_url: selectedProviderId === "ollama" ? ollamaUrl : undefined,
      });
      setActiveSetting(updated);
      setApiKey("");
      setStatusMsg({ text: "Model configuration & encrypted credentials saved successfully!", type: "success" });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setStatusMsg({ text: e.message || "Failed to save settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272a] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">AI Model & Provider Configuration</h3>
              <p className="text-[11px] text-zinc-400">Configure Cloud LLM providers, local Ollama models, and encrypted vault credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-md flex items-center space-x-2 text-xs ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/40 border border-red-800/60 text-red-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-medium">Select Model Provider</label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500 font-sans"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.requires_api_key ? "(API Key Required)" : "(No Key Required)"}
                </option>
              ))}
            </select>
          </div>

          {/* LLM Model Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium">LLM Audit Model</label>
              <select
                value={selectedLlm}
                onChange={(e) => setSelectedLlm(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              >
                {selectedProviderId === "ollama" && ollamaModels.length > 0
                  ? ollamaModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))
                  : currentProvider?.llm_models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
              </select>
            </div>

            {/* Embedding Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium">Vector Embedding Model</label>
              <select
                value={selectedEmbedding}
                onChange={(e) => setSelectedEmbedding(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              >
                {selectedProviderId === "ollama" && ollamaModels.length > 0
                  ? ollamaModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))
                  : currentProvider?.embedding_models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Ollama Connection Section */}
          {selectedProviderId === "ollama" && (
            <div className="p-3.5 border border-[#27272a] rounded-lg bg-[#151518] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-zinc-200">Ollama Local Instance</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      ollamaConnected
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {ollamaConnected ? "● Online" : "○ Disconnected"}
                  </span>
                </div>

                <button
                  onClick={() => loadOllamaTags(ollamaUrl)}
                  disabled={isOllamaLoading}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isOllamaLoading ? "animate-spin" : ""}`} />
                  <span>Refresh Models</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-zinc-200 font-mono text-[11px] focus:outline-none focus:border-zinc-500"
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Discovers local models pulled via <code className="text-zinc-400">ollama pull llama3.2</code> or <code className="text-zinc-400">nomic-embed-text</code>.
              </p>
            </div>
          )}

          {/* API Key Vault Input (for OpenAI, Anthropic, Gemini) */}
          {currentProvider?.requires_api_key && (
            <div className="space-y-2 p-3.5 border border-[#27272a] rounded-lg bg-[#151518]">
              <div className="flex items-center justify-between">
                <label className="text-zinc-200 font-medium flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentProvider.name} API Key</span>
                </label>
                <div className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>AES-256 Encrypted Vault</span>
                </div>
              </div>

              {activeSetting?.has_api_key && (
                <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-2 bg-[#18181b] p-2 rounded border border-[#27272a]">
                  <span className="text-zinc-500">Stored Key:</span>
                  <span className="text-zinc-200">{activeSetting.api_key_masked}</span>
                  <span className="text-emerald-400 text-[10px] ml-auto">✓ Active</span>
                </div>
              )}

              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeSetting?.has_api_key ? "Enter new API key to update stored secret..." : "Paste API Key (sk-...)"}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-3 pr-9 py-2 text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#27272a] bg-[#18181b]">
          <span className="text-[11px] text-zinc-500">
            {activeSetting?.provider ? `Active: ${activeSetting.provider.toUpperCase()} (${activeSetting.selected_llm})` : "Default: LOCAL"}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? "Encrypting & Saving..." : "Save & Apply Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
