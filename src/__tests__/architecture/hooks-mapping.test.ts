import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

/**
 * Feature: architecture-improvements
 * Property 2: Hooks domain mapping completeness
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

const HOOKS_ROOT = path.resolve(__dirname, "../../hooks");

interface HooksMappingEntry {
  domain: string;
  file: string;
}

const HOOKS_DOMAIN_MAPPING: HooksMappingEntry[] = [
  // balance/ — Requirement 2.2
  { domain: "balance", file: "useBalance.ts" },
  { domain: "balance", file: "use-global-balance.ts" },
  { domain: "balance", file: "use-balance-history.ts" },
  { domain: "balance", file: "use-debt-summary.ts" },
  { domain: "balance", file: "use-aggregated-debts.ts" },
  { domain: "balance", file: "use-simplified-debts.ts" },
  { domain: "balance", file: "useAllUsersDebt.ts" },
  { domain: "balance", file: "usePublicDebtApi.ts" },
  { domain: "balance", file: "use-settle-splits.ts" },

  // payment/ — Requirement 2.3
  { domain: "payment", file: "use-momo-payment.ts" },
  { domain: "payment", file: "use-momo-settings.ts" },
  { domain: "payment", file: "use-sepay-order.ts" },
  { domain: "payment", file: "use-sepay-settings.ts" },
  { domain: "payment", file: "use-bank-settings.ts" },

  // analytics/ — Requirement 2.4
  { domain: "analytics", file: "use-spending-comparison.ts" },
  { domain: "analytics", file: "use-spending-insights.ts" },
  { domain: "analytics", file: "use-spending-summary.ts" },
  { domain: "analytics", file: "use-spending-trend.ts" },
  { domain: "analytics", file: "use-expense-breakdown.ts" },
  { domain: "analytics", file: "use-category-breakdown.ts" },
  { domain: "analytics", file: "use-top-categories.ts" },
  { domain: "analytics", file: "use-top-spenders.ts" },
  { domain: "analytics", file: "use-top-transaction-partners.ts" },
  { domain: "analytics", file: "use-sample-leaderboard.ts" },

  // settings/ — Requirement 2.5
  { domain: "settings", file: "use-user-settings.ts" },
  { domain: "settings", file: "use-local-settings.ts" },
  { domain: "settings", file: "use-donation-settings.ts" },
  { domain: "settings", file: "use-persisted-state.ts" },

  // table/ — Requirement 2.6
  { domain: "table", file: "use-table-filter.ts" },
  { domain: "table", file: "use-table-pagination.ts" },
  { domain: "table", file: "use-table-sort.ts" },

  // ui/ — Requirement 2.7
  { domain: "ui", file: "use-media-query.ts" },
  { domain: "ui", file: "use-mobile.ts" },
  { domain: "ui", file: "use-keyboard-shortcut.ts" },
  { domain: "ui", file: "use-touch-interactions.ts" },
  { domain: "ui", file: "use-scrolled.ts" },
  { domain: "ui", file: "use-online-status.ts" },
  { domain: "ui", file: "use-progressive-disclosure.ts" },
  { domain: "ui", file: "use-document-title.ts" },
];

/** Root-level hooks that should NOT be in any subfolder — Requirement 2.8 */
const ROOT_LEVEL_HOOKS = [
  "use-enhanced-activity.ts",
  "use-recent-activity.ts",
  "use-contributing-expenses.ts",
  "use-bulk-operations.ts",
  "use-delete-splits.ts",
  "use-instant-mutation.ts",
];

const DOMAIN_SUBFOLDERS = [
  "balance",
  "payment",
  "analytics",
  "settings",
  "table",
  "ui",
];

describe("Feature: architecture-improvements, Property 2: Hooks domain mapping completeness", () => {
  /**
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   *
   * For any hook in the domain mapping, that file must exist
   * at the specified target subfolder under src/hooks/.
   */
  it("every mapped hook file exists in its domain subfolder", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HOOKS_DOMAIN_MAPPING),
        (entry: HooksMappingEntry) => {
          const filePath = path.join(HOOKS_ROOT, entry.domain, entry.file);
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
   * Validates: Requirements 2.8
   *
   * Root-level hooks must exist directly in src/hooks/ and NOT inside any subfolder.
   */
  it("root-level hooks exist in src/hooks/ and not inside any subfolder", () => {
    for (const hookFile of ROOT_LEVEL_HOOKS) {
      const rootPath = path.join(HOOKS_ROOT, hookFile);
      expect(
        fs.existsSync(rootPath),
        `Expected root-level hook to exist: ${hookFile}`
      ).toBe(true);

      for (const subfolder of DOMAIN_SUBFOLDERS) {
        const nestedPath = path.join(HOOKS_ROOT, subfolder, hookFile);
        expect(
          fs.existsSync(nestedPath),
          `Root-level hook ${hookFile} should NOT exist in ${subfolder}/`
        ).toBe(false);
      }
    }
  });
});
