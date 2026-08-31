import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import AdminRolesPage from "@/app/admin/roles/page";
import { api } from "@/lib/api";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/login",
}));

vi.mock("@/lib/api", () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({ status: "healthy", service: "docusage" }),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@docusage.ai",
        name: "Eleanor Vance",
        org_id: "11111111-1111-1111-1111-111111111111",
        role: "Partner",
        priority: 90,
        is_admin: true,
      },
    }),
    requestOtp: vi.fn().mockResolvedValue({
      message: "OTP sent",
      dev_otp: "948215",
    }),
    verifyOtp: vi.fn().mockResolvedValue({
      access_token: "test.access.token",
      refresh_token: "test.refresh.token",
      token_type: "Bearer",
      expires_in: 1800,
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@docusage.ai",
        name: "Eleanor Vance",
        org_id: "11111111-1111-1111-1111-111111111111",
        role: "Partner",
        priority: 90,
        is_admin: true,
      },
    }),
    getOrgRoles: vi.fn().mockResolvedValue({
      roles: [
        { id: 1, role_name: "Partner", priority: 90, is_admin: true, description: "Equity Partner" },
        { id: 2, role_name: "Junior Analyst", priority: 20, is_admin: false, description: "Junior" },
      ],
    }),
    getOrgMembers: vi.fn().mockResolvedValue({
      members: [
        {
          user_id: "00000000-0000-0000-0000-000000000001",
          name: "Eleanor Vance",
          email: "admin@docusage.ai",
          role_id: 1,
          role_name: "Partner",
          priority: 90,
          is_admin: true,
        },
      ],
    }),
    updateOrgRole: vi.fn().mockResolvedValue({ id: 2, role_name: "Junior Analyst", priority: 30 }),
    updateMember: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

describe("Authentication & RBAC Administration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and requests OTP", async () => {
    render(<LoginPage />);

    expect(screen.getByText(/Enterprise Document Security & Auditing/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/counsel@acmelegal.com/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/counsel@acmelegal.com/i);
    fireEvent.change(input, { target: { value: "test@docusage.ai" } });

    const submitBtn = screen.getByRole("button", { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.requestOtp).toHaveBeenCalledWith("test@docusage.ai");
    });
  });

  it("renders admin roles configuration dashboard", async () => {
    render(<AdminRolesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Organization Roles & Seniority RBAC/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Partner/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Junior Analyst/i).length).toBeGreaterThan(0);
    });
  });
});
