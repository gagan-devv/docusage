import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { DocumentViewer } from "@/components/reviewer/DocumentViewer";
import { PolicyInspector } from "@/components/reviewer/PolicyInspector";
import { DecisionDock } from "@/components/reviewer/DecisionDock";
import { Contract, GraphState } from "@/types";

describe("Human-in-the-Loop (HITL) Reviewer Flow", () => {
  const sampleContract: Contract = {
    id: 1,
    name: "Master_Services_Agreement_2026.pdf",
    file_path: "data/contracts/1.pdf",
    metadata: { size: 20000 },
    created_at: "2026-08-28T00:00:00Z",
  };

  const sampleGraphState: GraphState = {
    contract_id: 1,
    policy_id: 1,
    thread_id: "thread-test-1",
    rules: [
      { name: "Limitation of Liability Cap", query: "liability cap" },
    ],
    retrieved_clauses: {},
    deviations: [
      {
        rule: "Limitation of Liability Cap",
        risk: "HIGH",
        reason: "Liability uncapped for breach, exceeding maximum allowable 2x fees cap.",
      },
    ],
    risk_score: 0.33,
    status: "PAUSED_AT_HUMAN_REVIEW",
    iteration_count: 1,
    max_iterations: 3,
  };

  it("renders DocumentViewer with highlighted clauses and filter controls", () => {
    const onSelect = vi.fn();
    render(
      <DocumentViewer
        contract={sampleContract}
        onSelectClause={onSelect}
      />
    );

    expect(screen.getByText("Master_Services_Agreement_2026.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Section 8.2 - Limitation of Liability/i)).toBeInTheDocument();
    expect(screen.getByText(/Neither party shall be liable for indirect/)).toBeInTheDocument();

    // Clicking a clause triggers selection callback
    const clauseCard = screen.getByText(/Section 8.2 - Limitation of Liability/i);
    fireEvent.click(clauseCard);
    expect(onSelect).toHaveBeenCalled();
  });

  it("renders PolicyInspector showing LangGraph node state, risk score, and deviations", () => {
    render(
      <PolicyInspector
        graphState={sampleGraphState}
      />
    );

    expect(screen.getByText("LangGraph AI Inspector")).toBeInTheDocument();
    expect(screen.getByText("PAUSED_AT_HUMAN_REVIEW")).toBeInTheDocument();
    expect(screen.getByText("0.33")).toBeInTheDocument();
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
    expect(screen.getByText(/Liability uncapped for breach/)).toBeInTheDocument();
  });

  it("handles Human Decision Dock approval action", async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    render(
      <DecisionDock
        onDecision={onDecision}
        currentStatus="PAUSED_AT_HUMAN_REVIEW"
      />
    );

    const approveBtn = screen.getByText("Approve Contract");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(onDecision).toHaveBeenCalledWith("approve", "");
    });
  });

  it("handles Human Decision Dock revision request with legal feedback", async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    render(
      <DecisionDock
        onDecision={onDecision}
        currentStatus="PAUSED_AT_HUMAN_REVIEW"
      />
    );

    const feedbackInput = screen.getByPlaceholderText(/Waive uncapped liability/);
    fireEvent.change(feedbackInput, { target: { value: "Limit uncapped breach liability to $1,000,000" } });

    const reviseBtn = screen.getByText("Request Revision");
    fireEvent.click(reviseBtn);

    await waitFor(() => {
      expect(onDecision).toHaveBeenCalledWith("revise", "Limit uncapped breach liability to $1,000,000");
    });
  });

  it("handles Human Decision Dock rejection action", async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    render(
      <DecisionDock
        onDecision={onDecision}
        currentStatus="PAUSED_AT_HUMAN_REVIEW"
      />
    );

    const rejectBtn = screen.getByText("Reject");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(onDecision).toHaveBeenCalledWith("reject", "");
    });
  });
});
