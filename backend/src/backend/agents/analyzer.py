from typing import TypedDict, List, Dict, Any, Optional, Union
from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver

from src.backend.app.utils.db import get_db_connection, release_db_connection
from src.backend.app.services.rag import retrieve_relevant_clauses
from src.backend.app.utils.metrics import contract_evaluations_total
from src.backend.app.utils.tracking import track_contract_evaluation


class ContractAnalysisState(TypedDict):
    contract_id: Any
    policy_id: int
    thread_id: str
    rules: List[Dict[str, Any]]
    retrieved_clauses: Dict[str, List[str]]
    deviations: List[Dict[str, Any]]
    risk_score: float
    status: str
    human_action: Optional[str]  # 'approve', 'reject', 'revise'
    human_feedback: Optional[str]
    iteration_count: int
    max_iterations: int


def fetch_policy_rules(policy_id: int) -> List[Dict[str, Any]]:
    """Fetch policy rules from the database or return fallback default rules."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT rules FROM policies WHERE id = %s", (policy_id,))
        row = cursor.fetchone()
        cursor.close()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    finally:
        if conn:
            release_db_connection(conn)

    # Default baseline rules if policy table has no entry yet
    return [
        {"name": "limitation_of_liability", "query": "limitation of liability cap indemnification", "threshold": 0.5},
        {"name": "governing_law", "query": "governing law jurisdiction dispute resolution", "threshold": 0.5},
        {"name": "termination", "query": "termination for convenience breach notice period", "threshold": 0.5}
    ]


def persist_eval_metric(contract_id: int, metric_name: str, value: float):
    """Save compliance or risk metric to evals table."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO evals (contract_id, metric_name, value) VALUES (%s, %s, %s)",
            (contract_id, metric_name, value)
        )
        conn.commit()
        cursor.close()
    except Exception:
        pass
    finally:
        if conn:
            release_db_connection(conn)


# ----------------------------------------------------------------------
# Graph Node Implementations
# ----------------------------------------------------------------------

def retriever_node(state: ContractAnalysisState) -> Dict[str, Any]:
    """Agent Node: Retrieves clauses relevant to each policy rule."""
    contract_id = state["contract_id"]
    rules = state.get("rules") or fetch_policy_rules(state["policy_id"])
    
    retrieved = {}
    for rule in rules:
        query = rule.get("query", rule.get("name", "general clause"))
        try:
            clauses = retrieve_relevant_clauses(query, contract_id, top_k=2)
        except Exception:
            clauses = []
        retrieved[rule.get("name", "unknown")] = clauses

    return {
        "rules": rules,
        "retrieved_clauses": retrieved,
        "status": "retrieved"
    }


def auditor_node(state: ContractAnalysisState) -> Dict[str, Any]:
    """Agent Node: Audits clauses against policy rules and computes risk score."""
    rules = state.get("rules", [])
    retrieved = state.get("retrieved_clauses", {})
    deviations = []

    satisfied = 0
    for rule in rules:
        r_name = rule.get("name", "rule")
        clauses = retrieved.get(r_name, [])
        if not clauses:
            deviations.append({
                "rule": r_name,
                "risk": "HIGH",
                "reason": "Missing required covenant or clause not found in contract"
            })
        else:
            satisfied += 1

    total_rules = max(1, len(rules))
    # Risk score: fraction of rules deviating or unfulfilled
    risk_score = float((total_rules - satisfied) / total_rules)
    
    # Factor in previous human feedback if iterating
    if state.get("human_action") == "revise" and state.get("human_feedback"):
        # Human granted concessions or waived conditions -> discount risk
        risk_score = max(0.0, risk_score - 0.2)

    iteration = state.get("iteration_count", 0) + 1

    return {
        "deviations": deviations,
        "risk_score": risk_score,
        "iteration_count": iteration,
        "status": "audited"
    }


def should_require_human_review(state: ContractAnalysisState) -> str:
    """Routing condition: check if risk exceeds auto-approval threshold."""
    # If high risk deviations exist and under iteration limit -> human review
    max_iter = state.get("max_iterations", 3)
    if state.get("risk_score", 0.0) > 0.3 and state.get("iteration_count", 0) <= max_iter:
        return "human_review"
    return "finalize"


def human_review_node(state: ContractAnalysisState) -> Dict[str, Any]:
    """Human-in-the-loop Node: Resumes when human legal counsel supplies decision."""
    action = state.get("human_action", "pending")
    return {
        "status": f"human_decision_{action}"
    }


def route_human_decision(state: ContractAnalysisState) -> str:
    """Route based on human action: 'revise' triggers refinement loop; others finalize."""
    action = state.get("human_action")
    if action == "revise" and state.get("iteration_count", 0) < state.get("max_iterations", 3):
        return "refine"
    return "finalize"


def refinement_node(state: ContractAnalysisState) -> Dict[str, Any]:
    """Remediation Node: Adjusts analysis state with human counsel input and re-runs audit."""
    return {
        "status": "refining_with_feedback"
    }


def finalizer_node(state: ContractAnalysisState) -> Dict[str, Any]:
    """Finalizer Node: Logs compliance and audit metrics to database."""
    compliance_score = float(1.0 - state.get("risk_score", 0.0))
    if state.get("human_action") == "reject":
        final_status = "REJECTED_BY_LEGAL"
        compliance_score = 0.0
    elif state.get("human_action") == "approve":
        final_status = "APPROVED_BY_LEGAL"
        compliance_score = max(compliance_score, 0.9)
    else:
        final_status = "AUTO_COMPLETED"

    persist_eval_metric(state["contract_id"], "compliance_score", compliance_score)
    persist_eval_metric(state["contract_id"], "risk_score", state.get("risk_score", 0.0))

    try:
        contract_evaluations_total.labels(status=final_status).inc()
    except Exception:
        pass

    track_contract_evaluation(
        contract_id=state["contract_id"],
        policy_id=state.get("policy_id"),
        metrics={
            "compliance_score": compliance_score,
            "risk_score": float(state.get("risk_score", 0.0)),
            "iteration_count": float(state.get("iteration_count", 1))
        },
        params={
            "final_status": final_status,
            "human_action": str(state.get("human_action") or "none"),
            "deviations_count": len(state.get("deviations", []))
        }
    )

    return {
        "status": final_status,
        "risk_score": state.get("risk_score", 0.0)
    }


# ----------------------------------------------------------------------
# Graph Factory & Manager
# ----------------------------------------------------------------------

def create_contract_analysis_graph(checkpointer: Optional[MemorySaver] = None):
    """Build and compile the LangGraph workflow with interrupt_before on human_review."""
    if checkpointer is None:
        checkpointer = MemorySaver()

    builder = StateGraph(ContractAnalysisState)
    builder.add_node("retriever", retriever_node)
    builder.add_node("auditor", auditor_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("refine", refinement_node)
    builder.add_node("finalize", finalizer_node)

    builder.add_edge(START, "retriever")
    builder.add_edge("retriever", "auditor")
    
    # Conditional routing after auditor
    builder.add_conditional_edges(
        "auditor",
        should_require_human_review,
        {"human_review": "human_review", "finalize": "finalize"}
    )

    # Conditional routing after human decision
    builder.add_conditional_edges(
        "human_review",
        route_human_decision,
        {"refine": "refine", "finalize": "finalize"}
    )

    # Loop back from refine to auditor
    builder.add_edge("refine", "auditor")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=checkpointer, interrupt_before=["human_review"])


class ContractAnalysisEngine:
    """High-level facade orchestrating iterative human-in-the-loop contract reviews."""

    def __init__(self):
        self.memory = MemorySaver()
        self.graph = create_contract_analysis_graph(checkpointer=self.memory)

    def start_review(self, contract_id: int, policy_id: int, thread_id: str) -> Dict[str, Any]:
        config = {"configurable": {"thread_id": thread_id}}
        initial_state: ContractAnalysisState = {
            "contract_id": contract_id,
            "policy_id": policy_id,
            "thread_id": thread_id,
            "rules": [],
            "retrieved_clauses": {},
            "deviations": [],
            "risk_score": 0.0,
            "status": "started",
            "human_action": None,
            "human_feedback": None,
            "iteration_count": 0,
            "max_iterations": 3
        }

        # Run up to interrupt or completion
        result = self.graph.invoke(initial_state, config)
        snapshot = self.graph.get_state(config)
        next_nodes = snapshot.next

        is_interrupted = "human_review" in next_nodes
        return {
            "thread_id": thread_id,
            "is_interrupted": is_interrupted,
            "next_step": list(next_nodes),
            "state": snapshot.values
        }

    def submit_human_decision(
        self,
        thread_id: str,
        action: str,  # 'approve', 'reject', 'revise'
        feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = self.graph.get_state(config)
        if not snapshot.values:
            raise ValueError(f"No active session for thread_id: {thread_id}")

        # Update state with human input as the human_review node
        self.graph.update_state(
            config,
            {"human_action": action, "human_feedback": feedback},
            as_node="human_review"
        )

        # Resume execution until next interrupt or END
        self.graph.invoke(None, config)
        final_snapshot = self.graph.get_state(config)
        next_nodes = final_snapshot.next

        return {
            "thread_id": thread_id,
            "is_interrupted": "human_review" in next_nodes,
            "next_step": list(next_nodes),
            "state": final_snapshot.values
        }

    def get_state(self, thread_id: str) -> Optional[Dict[str, Any]]:
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = self.graph.get_state(config)
        if not snapshot.values:
            return None
        return {
            "thread_id": thread_id,
            "is_interrupted": "human_review" in snapshot.next,
            "next_step": list(snapshot.next),
            "state": snapshot.values
        }
