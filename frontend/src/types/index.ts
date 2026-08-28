export interface Contract {
  id: number;
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
  contract_id: number;
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
  contract_id: number;
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
