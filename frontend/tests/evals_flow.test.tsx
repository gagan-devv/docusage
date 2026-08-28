import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import EvalsPage from "@/app/evals/page";

vi.mock("@/lib/api", () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({ status: "healthy", service: "docusage" }),
    getContractEvals: vi.fn().mockImplementation(async (id) => [
      {
        id: 501,
        contract_id: id,
        metric_name: "compliance_score",
        value: 0.95,
        timestamp: "2026-08-28T15:00:00Z",
      },
      {
        id: 502,
        contract_id: id,
        metric_name: "risk_score",
        value: 0.15,
        timestamp: "2026-08-28T15:00:00Z",
      },
    ]),
  },
}));

describe("Evals & Metrics Workflow", () => {
  it("renders audit evaluation metrics table and Prometheus link", async () => {
    render(<EvalsPage />);

    expect(screen.getByText("Audit Evaluations & Observability")).toBeInTheDocument();
    expect(screen.getByText("Prometheus /metrics")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("compliance_score")).toBeInTheDocument();
      expect(screen.getByText("95.0%")).toBeInTheDocument();
      expect(screen.getByText("risk_score")).toBeInTheDocument();
    });
  });

  it("switches contract ID filter and reloads evaluation log", async () => {
    render(<EvalsPage />);

    const button2 = screen.getByText("#2");
    fireEvent.click(button2);

    await waitFor(() => {
      expect(screen.getByText("Evaluation Log for Contract #2")).toBeInTheDocument();
    });
  });
});
