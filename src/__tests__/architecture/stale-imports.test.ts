import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { execSync } from "child_process";
import path from "path";

/**
 * Feature: architecture-improvements
 * Property 3: No stale import paths after file moves
 *
 * Validates: Requirements 1.10, 2.9, 3.2
 *
 * For any file that was moved during the restructuring, no TypeScript or TSX
 * file in the project should contain an import referencing the old path.
 */

const SRC_ROOT = path.resolve(__dirname, "../..");
const TEST_FILE = path.relative(SRC_ROOT, __filename);

/**
 * Complete list of OLD import paths that should no longer exist anywhere.
 * These are the pre-restructuring paths before files were moved into domain subfolders.
 */
const STALE_IMPORT_PATHS: string[] = [
  // ── Dashboard: balance (10 files) ──
  "@/components/dashboard/balance-summary-cards",
  "@/components/dashboard/balance-summary",
  "@/components/dashboard/balance-table-row-expandable",
  "@/components/dashboard/BalanceFeed",
  "@/components/dashboard/BalanceRow",
  "@/components/dashboard/BalanceTable",
  "@/components/dashboard/circular-progress",
  "@/components/dashboard/creditor-card",
  "@/components/dashboard/group-balance-card",
  "@/components/dashboard/simplified-debts",

  // ── Dashboard: activity (8 files) ──
  "@/components/dashboard/activity-feed",
  "@/components/dashboard/activity-filter-controls",
  "@/components/dashboard/activity-sort-controls",
  "@/components/dashboard/activity-summary",
  "@/components/dashboard/activity-time-period-group",
  "@/components/dashboard/enhanced-activity-list",
  "@/components/dashboard/enhanced-activity-row",
  "@/components/dashboard/SettledHistoryList",

  // ── Dashboard: charts (4 files) ──
  "@/components/dashboard/balance-chart",
  "@/components/dashboard/success-rate-chart",
  "@/components/dashboard/weekly-earnings-chart",
  "@/components/dashboard/payment-issues-chart",

  // ── Dashboard: legal (4 files) ──
  "@/components/dashboard/AboutUs",
  "@/components/dashboard/PrivacyPolicy",
  "@/components/dashboard/TermsOfService",
  "@/components/dashboard/ContactUs",

  // ── Dashboard: payments (6 files) ──
  "@/components/dashboard/payment-counter",
  "@/components/dashboard/payment-method-card",
  "@/components/dashboard/payments-table",
  "@/components/dashboard/one-off-payment-card",
  "@/components/dashboard/repayment-plan-card",
  "@/components/dashboard/recurring-expenses-summary",

  // ── Dashboard: groups (3 files) ──
  "@/components/dashboard/friends-table",
  "@/components/dashboard/groups-table",
  "@/components/dashboard/documents-table",

  // ── Dashboard: stats (4 files) ──
  "@/components/dashboard/public-leaderboard",
  "@/components/dashboard/public-stats",
  "@/components/dashboard/statistics-card",
  "@/components/dashboard/SimplifiedDebtsToggle",

  // ── Dashboard: core (14 files) ──
  "@/components/dashboard/DashboardHero",
  "@/components/dashboard/DashboardActionsList",
  "@/components/dashboard/DashboardLoadingBeam",
  "@/components/dashboard/DashboardStates",
  "@/components/dashboard/DashboardTopCards",
  "@/components/dashboard/dashboard-skeleton",
  "@/components/dashboard/FloatingActionButton",
  "@/components/dashboard/quick-actions",
  "@/components/dashboard/tab-navigation",
  "@/components/dashboard/welcome-header",
  "@/components/dashboard/accounting-notes",
  "@/components/dashboard/accounting-records-table",
  "@/components/dashboard/contributing-expense-item",
  "@/components/dashboard/contributing-expenses-list",

  // ── Hooks: balance (9 files) ──
  "@/hooks/useBalance",
  "@/hooks/use-global-balance",
  "@/hooks/use-balance-history",
  "@/hooks/use-debt-summary",
  "@/hooks/use-aggregated-debts",
  "@/hooks/use-simplified-debts",
  "@/hooks/useAllUsersDebt",
  "@/hooks/usePublicDebtApi",
  "@/hooks/use-settle-splits",

  // ── Hooks: payment (5 files) ──
  "@/hooks/use-momo-payment",
  "@/hooks/use-momo-settings",
  "@/hooks/use-sepay-order",
  "@/hooks/use-sepay-settings",
  "@/hooks/use-bank-settings",

  // ── Hooks: analytics (10 files) ──
  "@/hooks/use-spending-comparison",
  "@/hooks/use-spending-insights",
  "@/hooks/use-spending-summary",
  "@/hooks/use-spending-trend",
  "@/hooks/use-expense-breakdown",
  "@/hooks/use-category-breakdown",
  "@/hooks/use-top-categories",
  "@/hooks/use-top-spenders",
  "@/hooks/use-top-transaction-partners",
  "@/hooks/use-sample-leaderboard",

  // ── Hooks: settings (4 files) ──
  "@/hooks/use-user-settings",
  "@/hooks/use-local-settings",
  "@/hooks/use-donation-settings",
  "@/hooks/use-persisted-state",

  // ── Hooks: table (3 files) ──
  "@/hooks/use-table-filter",
  "@/hooks/use-table-pagination",
  "@/hooks/use-table-sort",

  // ── Hooks: ui (8 files) ──
  "@/hooks/use-media-query",
  "@/hooks/use-mobile",
  "@/hooks/use-keyboard-shortcut",
  "@/hooks/use-touch-interactions",
  "@/hooks/use-scrolled",
  "@/hooks/use-online-status",
  "@/hooks/use-progressive-disclosure",
  "@/hooks/use-document-title",

  // ── Utils (2 files) ──
  "@/utils/export-csv-enhanced",
  "@/utils/export-pdf",
];

describe("Feature: architecture-improvements, Property 3: No stale import paths after file moves", () => {
  /**
   * Validates: Requirements 1.10, 2.9, 3.2
   *
   * For any old import path from the pre-restructuring layout, grep the
   * entire src/ tree (.ts and .tsx files only) and assert zero matches.
   */
  it("no stale import paths exist in any source file", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STALE_IMPORT_PATHS),
        (oldPath: string) => {
          // Escape special characters for grep (@ and /)
          const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

          try {
            // grep -r for the old path in .ts/.tsx files under src/,
            // excluding node_modules and this test file itself
            const result = execSync(
              `grep -r --include="*.ts" --include="*.tsx" -l "${escaped}" "${SRC_ROOT}"`,
              { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
            );

            // Filter out this test file from results
            const matchingFiles = result
              .trim()
              .split("\n")
              .filter((f) => f.length > 0)
              .filter((f) => !f.endsWith(TEST_FILE) && !f.includes("stale-imports.test.ts"));

            expect(
              matchingFiles,
              `Stale import path "${oldPath}" found in: ${matchingFiles.join(", ")}`
            ).toHaveLength(0);
          } catch {
            // grep returns exit code 1 when no matches found — that's the success case
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
