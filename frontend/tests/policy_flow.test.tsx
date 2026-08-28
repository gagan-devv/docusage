import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import PoliciesPage from "@/app/policies/page";

// Mock API to test interactive builder flow
vi.mock("@/lib/api", () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({ status: "healthy", service: "docusage" }),
    listPolicies: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Standard Enterprise Procurement Policy",
        rules: [
          { name: "Limitation of Liability", query: "liability cap", threshold: 0.8 },
          { name: "Governing Law", query: "governing law New York", threshold: 0.85 },
        ],
      },
    ]),
    createPolicy: vi.fn().mockImplementation(async (data) => ({
      id: 99,
      name: data.name,
      rules: data.rules,
    })),
    deletePolicy: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Policy Management Workflow", () => {
  it("renders existing policies and covenant rules", async () => {
    render(<PoliciesPage />);

    expect(screen.getByText("Compliance Policy Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Standard Enterprise Procurement Policy")).toBeInTheDocument();
      expect(screen.getByText("Limitation of Liability")).toBeInTheDocument();
      expect(screen.getByText("Governing Law")).toBeInTheDocument();
    });
  });

  it("allows opening policy builder and adding new covenant rule", async () => {
    render(<PoliciesPage />);

    const createBtn = screen.getByText("Create Policy");
    fireEvent.click(createBtn);

    expect(screen.getByText("Policy Specification Builder")).toBeInTheDocument();

    const policyNameInput = screen.getByPlaceholderText(/SaaS Vendor Standard Covenants/);
    fireEvent.change(policyNameInput, { target: { value: "Fintech Compliance 2026" } });

    const ruleNameInput = screen.getByPlaceholderText(/Rule Name/);
    const ruleQueryInput = screen.getByPlaceholderText(/Semantic Vector Query/);

    fireEvent.change(ruleNameInput, { target: { value: "Audit Rights" } });
    fireEvent.change(ruleQueryInput, { target: { value: "right to audit annual SOC 2 report" } });

    const addBtn = screen.getByText("Add");
    fireEvent.click(addBtn);

    expect(screen.getByText("Audit Rights")).toBeInTheDocument();
    expect(screen.getByText(/right to audit annual SOC 2 report/)).toBeInTheDocument();
  });
});
