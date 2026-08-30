import { Contract, Policy, PolicyRule, EvalItem, AnalysisSession, ModelProvider, UserSetting, OllamaModelTag } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errObj = await response.json();
      errorDetail = errObj.detail || errorDetail;
    } catch {}
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<{ status: string; service: string }> {
    return fetchJson("/health");
  },

  // Contracts
  async listContracts(skip = 0, limit = 50): Promise<Contract[]> {
    return fetchJson(`/contracts/?skip=${skip}&limit=${limit}`);
  },

  async getContract(id: string | number): Promise<Contract> {
    return fetchJson(`/contracts/${id}`);
  },

  async uploadContract(file: File): Promise<Contract> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/contracts/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Failed to upload contract: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteContract(id: string | number): Promise<void> {
    return fetchJson(`/contracts/${id}`, { method: "DELETE" });
  },

  async getTaskStatus(taskId: string): Promise<{ task_id: string; status: string; ready: boolean }> {
    return fetchJson(`/contracts/tasks/${taskId}`);
  },

  // Policies
  async listPolicies(skip = 0, limit = 50): Promise<Policy[]> {
    return fetchJson(`/policies/?skip=${skip}&limit=${limit}`);
  },

  async getPolicy(id: number): Promise<Policy> {
    return fetchJson(`/policies/${id}`);
  },

  async createPolicy(data: { name: string; rules: PolicyRule[] }): Promise<Policy> {
    return fetchJson("/policies/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deletePolicy(id: number): Promise<void> {
    return fetchJson(`/policies/${id}`, { method: "DELETE" });
  },

  // LangGraph AI Analysis & HITL
  async startAnalysis(contractId: string | number, policyId: number, threadId?: string): Promise<AnalysisSession> {
    const path = `/contracts/${contractId}/graph/start/${policyId}${threadId ? `?thread_id=${threadId}` : ""}`;
    return fetchJson(path, { method: "POST" });
  },

  async getAnalysisState(threadId: string): Promise<AnalysisSession> {
    return fetchJson(`/contracts/graph/${threadId}`);
  },

  async submitReview(
    threadId: string,
    action: "approve" | "reject" | "revise",
    feedback?: string
  ): Promise<AnalysisSession> {
    return fetchJson(`/contracts/graph/${threadId}/review`, {
      method: "POST",
      body: JSON.stringify({ action, feedback }),
    });
  },

  // Evals
  async getContractEvals(contractId: string | number): Promise<EvalItem[]> {
    return fetchJson(`/contracts/${contractId}/evals`);
  },

  // Settings & Model Providers
  async getProviders(): Promise<{ providers: ModelProvider[] }> {
    return fetchJson("/settings/providers");
  },

  async getOllamaModels(baseUrl?: string): Promise<{ base_url: string; connected: boolean; models: OllamaModelTag[] }> {
    return fetchJson(`/settings/ollama/models${baseUrl ? `?url=${encodeURIComponent(baseUrl)}` : ""}`);
  },

  async getSettings(): Promise<UserSetting> {
    return fetchJson("/settings/");
  },

  async saveSettings(data: {
    provider: string;
    selected_llm: string;
    selected_embedding: string;
    api_key?: string;
    ollama_base_url?: string;
  }): Promise<UserSetting> {
    return fetchJson("/settings/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
