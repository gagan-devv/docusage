import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ContractTable } from "@/components/contracts/ContractTable";
import { UploadModal } from "@/components/contracts/UploadModal";
import { Contract } from "@/types";

describe("Dashboard Workflow Components", () => {
  it("renders StatsBar with correct KPI metrics", () => {
    render(
      <StatsBar
        totalContracts={128}
        totalClauses={1420}
        avgCompliance={94.2}
        pendingReviews={3}
      />
    );

    expect(screen.getByText("Total Contracts")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("Audited Clauses")).toBeInTheDocument();
    expect(screen.getByText("1,420")).toBeInTheDocument();
    expect(screen.getByText("94.2%")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders ContractTable with contracts and handles action clicks", () => {
    const mockDelete = vi.fn();
    const contracts: Contract[] = [
      {
        id: 42,
        name: "Enterprise_Vendor_Agreement.pdf",
        file_path: "data/contracts/42.pdf",
        metadata: { pages: 12 },
        created_at: "2026-08-28T12:00:00Z",
      },
    ];

    render(<ContractTable contracts={contracts} onDeleteContract={mockDelete} />);

    expect(screen.getByText("Enterprise_Vendor_Agreement.pdf")).toBeInTheDocument();
    expect(screen.getByText("Review Audit")).toBeInTheDocument();

    const deleteBtn = screen.getByTitle("Delete contract");
    fireEvent.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledWith(42);
  });

  it("renders UploadModal and toggles visibility", () => {
    const onClose = vi.fn();
    const onUploadSuccess = vi.fn();

    const { rerender } = render(
      <UploadModal isOpen={false} onClose={onClose} onUploadSuccess={onUploadSuccess} />
    );
    expect(screen.queryByText("Ingest New Legal Document")).not.toBeInTheDocument();

    rerender(
      <UploadModal isOpen={true} onClose={onClose} onUploadSuccess={onUploadSuccess} />
    );
    expect(screen.getByText("Ingest New Legal Document")).toBeInTheDocument();
    expect(screen.getByText("Click to browse or drop file here")).toBeInTheDocument();

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
