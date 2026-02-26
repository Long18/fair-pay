import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComparisonBanner } from "../comparison-banner";
import { ComparisonView } from "../comparison-view";
import type { SimplifiedBalance } from "../../hooks/use-simplified-balances";

// Mock i18n — return fallback string, interpolate {{count}}
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const fallback = typeof fallbackOrOpts === "string" ? fallbackOrOpts : key;
      const params = typeof fallbackOrOpts === "object" ? fallbackOrOpts : opts;
      if (params && "count" in params) {
        return fallback.replace("{{count}}", String(params.count));
      }
      return fallback;
    },
  }),
}));

// ============================================================================
// Fixtures
// ============================================================================

function makeDebt(
  fromId: string,
  fromName: string,
  toId: string,
  toName: string,
  amount: number,
): SimplifiedBalance {
  return {
    from_user_id: fromId,
    from_user_name: fromName,
    from_user_avatar_url: null,
    to_user_id: toId,
    to_user_name: toName,
    to_user_avatar_url: null,
    amount,
  };
}

const originalDebts: SimplifiedBalance[] = [
  makeDebt("u1", "Alice", "u2", "Bob", 100),
  makeDebt("u1", "Alice", "u3", "Charlie", 200),
  makeDebt("u2", "Bob", "u3", "Charlie", 50),
];

const simplifiedDebts: SimplifiedBalance[] = [
  makeDebt("u1", "Alice", "u3", "Charlie", 300),
  makeDebt("u2", "Bob", "u3", "Charlie", 50),
];

// ============================================================================
// ComparisonBanner Tests
// ============================================================================

describe("ComparisonBanner", () => {
  it("renders correct transactionsSaved count", () => {
    render(
      <ComparisonBanner
        originalCount={3}
        simplifiedCount={2}
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    // "1 transaction(s) eliminated" with {{count}} replaced
    expect(screen.getByText("1 transaction(s) eliminated")).toBeInTheDocument();
  });

  it("renders correct reduction percentage badge", () => {
    render(
      <ComparisonBanner
        originalCount={3}
        simplifiedCount={2}
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    // Math.round((1/3)*100) = 33
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  it("returns null when transactionsSaved is 0 (originalCount === simplifiedCount)", () => {
    const { container } = render(
      <ComparisonBanner
        originalCount={3}
        simplifiedCount={3}
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("returns null when simplifiedCount > originalCount", () => {
    const { container } = render(
      <ComparisonBanner
        originalCount={2}
        simplifiedCount={3}
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows correct totals in expanded content", async () => {
    render(
      <ComparisonBanner
        originalCount={3}
        simplifiedCount={2}
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
        currency="₫"
      />,
    );

    // Click the collapsible trigger to expand
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Original: 3 transactions
    expect(screen.getByText(/Original.*3/)).toBeInTheDocument();
    // Simplified: 2 transactions
    expect(screen.getByText(/Simplified.*2/)).toBeInTheDocument();
  });
});

// ============================================================================
// ComparisonView Tests
// ============================================================================

describe("ComparisonView", () => {
  it("renders original and simplified debt lists", () => {
    render(
      <ComparisonView
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    // Both column headers present
    expect(screen.getByText("Original Debts")).toBeInTheDocument();
    expect(screen.getByText("Simplified Debts")).toBeInTheDocument();

    // All user names from original debts visible
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Charlie").length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct transaction counts in badges", () => {
    render(
      <ComparisonView
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    // Original: 3 transactions, Simplified: 2 transactions
    expect(screen.getByText("3 transactions")).toBeInTheDocument();
    expect(screen.getByText("2 transactions")).toBeInTheDocument();
  });

  it("shows total transferred amounts", () => {
    render(
      <ComparisonView
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
        currency="₫"
      />,
    );

    // Both columns show "Total transferred" label
    const totalLabels = screen.getAllByText("Total transferred");
    expect(totalLabels).toHaveLength(2);
  });

  it("shows empty state when no debts", () => {
    render(
      <ComparisonView originalDebts={[]} simplifiedDebts={[]} />,
    );

    const noDebtsMessages = screen.getAllByText("No debts");
    expect(noDebtsMessages).toHaveLength(2);
  });

  it("has correct grid layout classes (grid-cols-1 md:grid-cols-2)", () => {
    const { container } = render(
      <ComparisonView
        originalDebts={originalDebts}
        simplifiedDebts={simplifiedDebts}
      />,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("md:grid-cols-2");
  });
});
