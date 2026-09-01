import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DocumentViewer } from "../src/components/reviewer/DocumentViewer";
import { PolicyInspector } from "../src/components/reviewer/PolicyInspector";
import { Contract, ContractClause, ClauseHighlight, GraphState } from "../src/types";

describe("CRAG Reviewer UI Components", () => {
  const mockContract: Contract = {
    id: "test-contract-1",
    name: "Conv. Centre Permission.pdf",
    file_path: "data/contracts/test.pdf",
    metadata: { size: 75000 },
    created_at: "2026-08-31T20:00:00Z"
  };

  const mockClauses: ContractClause[] = [
    {
      id: 1,
      contract_id: "test-contract-1",
      text: "To, The Director, ABV-IIITM Gwalior. Subject: Request for Permission to Use Convention Centre for Decoration and Rehearsal.",
      clause_type: "Header & Purpose"
    },
    {
      id: 2,
      contract_id: "test-contract-1",
      text: "Yours sincerely, Prakhar Srivastava, SAC Cultural Secretary, Gagan Ahlawat, SAC Secretary.",
      clause_type: "Signatures"
    }
  ];

  const mockHighlights: ClauseHighlight[] = [
    {
      id: "finding-0",
      section: "Policy Covenant",
      text: "No limitation of liability covenants were found in Conv. Centre Permission.pdf.",
      type: "MISSING_COVENANT",
      ruleName: "Limitation of Liability Cap",
      confidence: 0.98,
      rationale: "No limitation of liability covenants were found in the uploaded document."
    }
  ];

  it("renders CRAG findings and allows viewing raw extracted chunks", () => {
    render(
      <DocumentViewer
        contract={mockContract}
        clauses={mockClauses}
        highlightedClauses={mockHighlights}
      />
    );

    expect(screen.getByText("Conv. Centre Permission.pdf")).toBeDefined();
    expect(screen.getByText("MISSING COVENANT")).toBeDefined();
    expect(screen.getByText("Policy Covenant: Limitation of Liability Cap")).toBeDefined();
  });

  it("renders PolicyInspector with CRAG confidence scores and retrieval grades", () => {
    const mockGraphState: GraphState = {
      contract_id: "test-contract-1",
      policy_id: 1,
      thread_id: "test-thread",
      rules: [{ name: "Limitation of Liability Cap", query: "limitation of liability cap" }],
      retrieved_clauses: {},
      crag_findings: [
        {
          rule_name: "Limitation of Liability Cap",
          status: "MISSING_COVENANT",
          confidence_score: 0.98,
          retrieval_grade: "INCORRECT",
          citations: [],
          rationale: "Institutional permission letter does not contain commercial liability terms."
        }
      ],
      deviations: [],
      risk_score: 0.0,
      status: "AUTO_COMPLETED",
      iteration_count: 1,
      max_iterations: 3
    };

    render(
      <PolicyInspector
        graphState={mockGraphState}
      />
    );

    expect(screen.getByText("CRAG Compliance Inspector")).toBeDefined();
    expect(screen.getByText("INCORRECT")).toBeDefined();
    expect(screen.getByText("MISSING COVENANT")).toBeDefined();
    expect(screen.getByText("Institutional permission letter does not contain commercial liability terms.")).toBeDefined();
  });

  it("highlights activeCitationQuote inside raw chunks when deep-linking", () => {
    render(
      <DocumentViewer
        contract={mockContract}
        clauses={mockClauses}
        highlightedClauses={mockHighlights}
        activeCitationQuote="Permission to Use Convention Centre"
      />
    );

    expect(screen.getByText("Permission to Use Convention Centre")).toBeDefined();
    expect(screen.getByText("Matching Citation Target")).toBeDefined();
  });

  it("renders page markers and section headers in raw chunks view", () => {
    const multiPageClauses: ContractClause[] = [
      {
        id: 10,
        contract_id: "test-contract-1",
        text: "Section 1 preamble text",
        clause_type: "Preamble",
        page_number: 1,
        section_header: "1. PREAMBLE"
      },
      {
        id: 11,
        contract_id: "test-contract-1",
        text: "Section 7 terms text",
        clause_type: "Clause",
        page_number: 2,
        section_header: "7. TERMS OF AGREEMENT"
      }
    ];

    render(
      <DocumentViewer
        contract={mockContract}
        clauses={multiPageClauses}
        highlightedClauses={mockHighlights}
        activeCitationQuote="terms text"
      />
    );

    expect(screen.getByText("Document Page 1")).toBeDefined();
    expect(screen.getByText("Document Page 2")).toBeDefined();
    expect(screen.getByText("7. TERMS OF AGREEMENT")).toBeDefined();
  });
});
