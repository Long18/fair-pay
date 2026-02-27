import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

/**
 * Feature: architecture-improvements
 * Property 1: Dashboard domain mapping completeness
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
 */

const DASHBOARD_ROOT = path.resolve(__dirname, "../../components/dashboard");

interface DashboardMappingEntry {
  domain: string;
  file: string;
}

const DASHBOARD_DOMAIN_MAPPING: DashboardMappingEntry[] = [
  // balance/ — Requirement 1.3
  { domain: "balance", file: "balance-summary-cards.tsx" },
  { domain: "balance", file: "balance-summary.tsx" },
  { domain: "balance", file: "balance-table-row-expandable.tsx" },
  { domain: "balance", file: "BalanceFeed.tsx" },
  { domain: "balance", file: "BalanceRow.tsx" },
  { domain: "balance", file: "BalanceTable.tsx" },
  { domain: "balance", file: "circular-progress.tsx" },
  { domain: "balance", file: "creditor-card.tsx" },
  { domain: "balance", file: "group-balance-card.tsx" },
  { domain: "balance", file: "simplified-debts.tsx" },

  // activity/ — Requirement 1.4
  { domain: "activity", file: "activity-feed.tsx" },
  { domain: "activity", file: "activity-filter-controls.tsx" },
  { domain: "activity", file: "activity-sort-controls.tsx" },
  { domain: "activity", file: "activity-summary.tsx" },
  { domain: "activity", file: "activity-time-period-group.tsx" },
  { domain: "activity", file: "enhanced-activity-list.tsx" },
  { domain: "activity", file: "enhanced-activity-row.tsx" },
  { domain: "activity", file: "SettledHistoryList.tsx" },

  // charts/ — Requirement 1.6
  { domain: "charts", file: "balance-chart.tsx" },
  { domain: "charts", file: "success-rate-chart.tsx" },
  { domain: "charts", file: "weekly-earnings-chart.tsx" },
  { domain: "charts", file: "payment-issues-chart.tsx" },

  // legal/ — Requirement 1.2
  { domain: "legal", file: "AboutUs.tsx" },
  { domain: "legal", file: "PrivacyPolicy.tsx" },
  { domain: "legal", file: "TermsOfService.tsx" },
  { domain: "legal", file: "ContactUs.tsx" },

  // payments/ — Requirement 1.5
  { domain: "payments", file: "payment-counter.tsx" },
  { domain: "payments", file: "payment-method-card.tsx" },
  { domain: "payments", file: "payments-table.tsx" },
  { domain: "payments", file: "one-off-payment-card.tsx" },
  { domain: "payments", file: "repayment-plan-card.tsx" },
  { domain: "payments", file: "recurring-expenses-summary.tsx" },

  // groups/ — Requirement 1.8
  { domain: "groups", file: "friends-table.tsx" },
  { domain: "groups", file: "groups-table.tsx" },
  { domain: "groups", file: "documents-table.tsx" },

  // stats/ — Requirement 1.7
  { domain: "stats", file: "public-leaderboard.tsx" },
  { domain: "stats", file: "public-stats.tsx" },
  { domain: "stats", file: "statistics-card.tsx" },
  { domain: "stats", file: "SimplifiedDebtsToggle.tsx" },

  // core/ — Requirement 1.9
  { domain: "core", file: "DashboardHero.tsx" },
  { domain: "core", file: "DashboardActionsList.tsx" },
  { domain: "core", file: "DashboardLoadingBeam.tsx" },
  { domain: "core", file: "DashboardStates.tsx" },
  { domain: "core", file: "DashboardTopCards.tsx" },
  { domain: "core", file: "dashboard-skeleton.tsx" },
  { domain: "core", file: "FloatingActionButton.tsx" },
  { domain: "core", file: "quick-actions.tsx" },
  { domain: "core", file: "tab-navigation.tsx" },
  { domain: "core", file: "welcome-header.tsx" },
  { domain: "core", file: "accounting-notes.tsx" },
  { domain: "core", file: "accounting-records-table.tsx" },
  { domain: "core", file: "contributing-expense-item.tsx" },
  { domain: "core", file: "contributing-expenses-list.tsx" },
];

describe("Feature: architecture-improvements, Property 1: Dashboard domain mapping completeness", () => {
  /**
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
   *
   * For any file in the dashboard domain mapping, that file must exist
   * at the specified target subfolder under src/components/dashboard/.
   */
  it("every mapped dashboard file exists in its domain subfolder", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DASHBOARD_DOMAIN_MAPPING),
        (entry: DashboardMappingEntry) => {
          const filePath = path.join(DASHBOARD_ROOT, entry.domain, entry.file);
          expect(
            fs.existsSync(filePath),
            `Expected file to exist: ${entry.domain}/${entry.file}`
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.1
   *
   * The enhanced-activity/ subdirectory must exist inside activity/.
   */
  it("enhanced-activity subdirectory exists inside activity/", () => {
    const dirPath = path.join(DASHBOARD_ROOT, "activity", "enhanced-activity");
    expect(
      fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
      "Expected enhanced-activity/ subdirectory inside activity/"
    ).toBe(true);
  });

  /**
   * No .tsx files should remain at the root level of src/components/dashboard/.
   * Only subdirectories should exist there.
   */
  it("no .tsx files remain at root level of dashboard directory", () => {
    const entries = fs.readdirSync(DASHBOARD_ROOT, { withFileTypes: true });
    const rootTsxFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
      .map((e) => e.name);

    expect(
      rootTsxFiles,
      `Found .tsx files at dashboard root: ${rootTsxFiles.join(", ")}`
    ).toEqual([]);
  });
});
