import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExternalAgentSubmissionInbox from "@/components/agent/ExternalAgentSubmissionInbox";
import { supabaseClient } from "@/utility/supabaseClient";

const submissions = [
  {
    submission_id: "11111111-1111-4111-8111-111111111111",
    target_email: "client@example.com",
    group_id: null,
    group_name: "Client Trip",
    source: "chatgpt",
    status: "pending",
    visibility: "target_email",
    duplicate_warnings: [],
    created_at: "2026-06-24T08:00:00Z",
    expires_at: "2026-07-24T08:00:00Z",
    payload: {
      description: "Client dinner",
      amount: 450000,
      currency: "VND",
      expense_date: "2026-06-24",
      split_method: "equal",
      payer: { email: "client@example.com" },
      participants: [{ email: "client@example.com" }, { email: "friend@example.com" }],
    },
  },
  {
    submission_id: "22222222-2222-4222-8222-222222222222",
    target_email: "member@example.com",
    group_id: "33333333-3333-4333-8333-333333333333",
    group_name: "Admin Group",
    source: "external-agent",
    status: "pending",
    visibility: "group_admin",
    duplicate_warnings: [],
    created_at: "2026-06-24T08:05:00Z",
    expires_at: "2026-07-24T08:05:00Z",
    payload: {
      description: "Admin-reviewed taxi",
      amount: 200000,
      currency: "VND",
      split_method: "equal",
      payer: { display_name: "Member One" },
      participants: [{ display_name: "Member One" }, { display_name: "Member Two" }],
    },
  },
];

function renderInbox() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ExternalAgentSubmissionInbox />
    </QueryClientProvider>,
  );
}

describe("ExternalAgentSubmissionInbox", () => {
  it("separates client confirmations from admin approvals", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({ data: submissions, error: null });

    renderInbox();

    expect(await screen.findByText("Agent submissions pending approval")).toBeInTheDocument();

    const clientSection = screen.getByText("Client confirmations").closest("div");
    const adminSection = screen.getByText("Admin approvals").closest("div");

    expect(clientSection).not.toBeNull();
    expect(adminSection).not.toBeNull();
    expect(within(clientSection as HTMLElement).getByText("1")).toBeInTheDocument();
    expect(within(adminSection as HTMLElement).getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Client dinner")).toBeInTheDocument();
    expect(screen.getByText("Admin-reviewed taxi")).toBeInTheDocument();
    expect(screen.getByText("Your email")).toBeInTheDocument();
    expect(screen.getByText("Group admin")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /approve/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /reject/i })).toHaveLength(2);
  });
});
