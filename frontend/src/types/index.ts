export interface Contract {
  id: string | number;
  name: string;
  file_path: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PolicyRule {
  name: string;
  query: string;
  threshold?: number;
}

export interface Policy {
  id: number;
  name: string;
  rules: PolicyRule[];
}

export interface EvalItem {
  id: number;
  contract_id: string | number;
  metric_name: string;
  value: number;
  timestamp: string;
}

export interface RuleMatch {
  satisfied: boolean;
  evidence: string | null;
}

export interface GraphDeviation {
  rule: string;
  risk: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

export interface GraphState {
  contract_id: string | number;
  policy_id: number;
  thread_id: string;
  rules: PolicyRule[];
  retrieved_clauses: Record<string, string[]>;
  deviations: GraphDeviation[];
  risk_score: number;
  status: string;
  human_action?: "approve" | "reject" | "revise" | null;
  human_feedback?: string | null;
  iteration_count: number;
  max_iterations: number;
}

export interface AnalysisSession {
  thread_id: string;
  is_interrupted: boolean;
  next_step: string[];
  state: GraphState;
}

export interface ModelProvider {
  id: string;
  name: string;
  requires_api_key: boolean;
  llm_models: string[];
  embedding_models: string[];
}

export interface UserSetting {
  id: number;
  provider: string;
  selected_llm: string;
  selected_embedding: string;
  api_key_masked?: string;
  has_api_key: boolean;
  ollama_base_url?: string;
  is_active: boolean;
  updated_at?: string | null;
}

export interface OllamaModelTag {
  name: string;
  size?: number;
  digest?: string;
}
