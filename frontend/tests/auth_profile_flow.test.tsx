import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import ProfilePage from "@/app/profile/page";
import LogoutPage from "@/app/logout/page";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/profile",
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
      message: "Verification OTP sent successfully",
      dev_otp: "948215",
    }),
    verifyOtp: vi.fn().mockResolvedValue({
      access_token: "test.jwt.access",
      refresh_token: "test.jwt.refresh",
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
    getProfile: vi.fn().mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@docusage.ai",
      name: "Eleanor Vance, Esq.",
      title: "Senior Regulatory Counsel",
      department: "Strategic M&A & AI Governance",
      phone: "+1 (212) 555-0198",
      bio: "Specializing in cross-border tech transactions and regulatory diligence.",
      jurisdictions: ["Delaware (Bar #48921)", "New York (Bar #512093)"],
      timezone: "America/New_York (EST)",
      org_id: "11111111-1111-1111-1111-111111111111",
      org_name: "Skadden Legal Enclave",
      role_name: "Partner",
      priority: 90,
      is_admin: true,
      preferences: {
        risk_tolerance: "conservative",
        alert_high_risk: true,
        alert_delegation: true,
        weekly_digest: true,
      },
      active_sessions_count: 2,
    }),
    updateProfile: vi.fn().mockImplementation((payload) =>
      Promise.resolve({
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@docusage.ai",
        name: payload.name || "Eleanor Vance, Esq.",
        title: payload.title || "Senior Regulatory Counsel",
        department: payload.department || "Strategic M&A & AI Governance",
        phone: payload.phone || "+1 (212) 555-0198",
        bio: payload.bio || "Updated bio text.",
        jurisdictions: payload.jurisdictions || ["Delaware (Bar #48921)"],
        timezone: payload.timezone || "America/New_York (EST)",
        org_id: "11111111-1111-1111-1111-111111111111",
        org_name: "Skadden Legal Enclave",
        role_name: "Partner",
        priority: 90,
        is_admin: true,
        preferences: payload.preferences || {},
        active_sessions_count: 2,
      })
    ),
    getSessions: vi.fn().mockResolvedValue([
      {
        id: "sess-1",
        device_info: 'MacBook Pro 16" (Sonoma) • Chrome 124.0',
        ip_address: "198.51.100.24 (New York, US)",
        last_active: "Active Now",
        is_current: true,
      },
      {
        id: "sess-2",
        device_info: 'iPad Pro 12.9" • Safari Mobile',
        ip_address: "198.51.100.88 (New York, US)",
        last_active: "2 hours ago",
        is_current: false,
      },
    ]),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Authentication, Profile & Logout Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders AuthForm and toggles between Sign In and Create Account modes", async () => {
    render(<AuthForm initialMode="login" />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();

    // Toggle to Create Account
    fireEvent.click(screen.getByText("Create Account"));

    expect(screen.getByPlaceholderText(/Eleanor Vance, Esq./i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Senior Counsel/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Commercial M&A/i)).toBeInTheDocument();

    // Toggle back to Sign In
    fireEvent.click(screen.getByText("Sign In"));
    expect(screen.queryByPlaceholderText(/Eleanor Vance, Esq./i)).not.toBeInTheDocument();
  });

  it("handles demo persona login click", async () => {
    render(<AuthForm initialMode="login" />);

    const partnerBtn = screen.getByRole("button", { name: /Partner \(Admin\)/i });
    fireEvent.click(partnerBtn);

    await waitFor(() => {
      expect(api.requestOtp).toHaveBeenCalledWith("admin@docusage.ai");
      expect(api.verifyOtp).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("renders Navbar user dropdown and initiates logout", async () => {
    render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByText(/Eleanor/i)).toBeInTheDocument();
    });

    // Open User Dropdown
    const userButton = screen.getByRole("button", { name: /User account menu/i });
    fireEvent.click(userButton);

    expect(screen.getByText("Executive Profile & Clearance")).toBeInTheDocument();
    expect(screen.getByText("AI Providers & Credentials")).toBeInTheDocument();
    expect(screen.getByText("Log Out Session")).toBeInTheDocument();

    // Click Log Out
    const logoutBtn = screen.getByText("Log Out Session");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/logout");
    });
  });

  it("renders ProfilePage with multi-tabbed sections and allows saving updates", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Executive Profile & Clearance")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Eleanor Vance, Esq.")).toBeInTheDocument();
      expect(screen.getByText("General Info")).toBeInTheDocument();
      expect(screen.getByText("Organization & Seniority")).toBeInTheDocument();
      expect(screen.getByText("Audit Preferences")).toBeInTheDocument();
      expect(screen.getByText("Security & Sessions")).toBeInTheDocument();
    });

    // Switch to Organization & Seniority tab
    fireEvent.click(screen.getByText("Organization & Seniority"));
    expect(screen.getByText("Seniority Influence & Authority Rank")).toBeInTheDocument();
    expect(screen.getByText(/P90 \/ 100/i)).toBeInTheDocument();

    // Switch to Audit Preferences tab
    fireEvent.click(screen.getByText("Audit Preferences"));
    expect(screen.getByText("Audit Risk Tolerance Threshold")).toBeInTheDocument();
    expect(screen.getByText(/Strict \(5% Variance\)/i)).toBeInTheDocument();

    // Switch to Security & Sessions tab
    fireEvent.click(screen.getByText("Security & Sessions"));
    expect(screen.getByText("Active Cryptographic Device Sessions")).toBeInTheDocument();
    expect(screen.getByText(/MacBook Pro 16"/i)).toBeInTheDocument();

    // Save profile changes
    const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalled();
    });
  });

  it("renders LogoutPage and confirms session revocation", async () => {
    render(<LogoutPage />);

    await waitFor(() => {
      expect(screen.getByText(/Session Terminated Securely/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign Back In/i)).toBeInTheDocument();
    });
  });
});
