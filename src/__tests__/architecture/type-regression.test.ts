import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

/**
 * Feature: architecture-improvements
 * Property 4: Type error count non-regression
 *
 * Validates: Requirements 4.2
 *
 * Run `tsc --noEmit` and assert the error count is less than or equal to
 * the pre-restructuring baseline (0 errors).
 */

const TYPE_ERROR_BASELINE = 0;

describe("Feature: architecture-improvements, Property 4: Type error count non-regression", () => {
  it("type error count does not exceed the pre-restructuring baseline", () => {
    let output = "";
    try {
      execSync("npx tsc --noEmit 2>&1", {
        encoding: "utf-8",
        cwd: process.cwd(),
      });
      // If tsc exits with code 0, there are no errors
    } catch (err: unknown) {
      // tsc exits with code 2 when there are type errors — capture stdout
      if (err && typeof err === "object" && "stdout" in err) {
        output = (err as { stdout: string }).stdout ?? "";
      }
    }

    const errorLines = output
      .split("\n")
      .filter((line) => line.includes("error TS"));

    const errorCount = errorLines.length;

    expect(
      errorCount,
      `Expected <= ${TYPE_ERROR_BASELINE} type errors but found ${errorCount}.\n` +
        `First 10 errors:\n${errorLines.slice(0, 10).join("\n")}`
    ).toBeLessThanOrEqual(TYPE_ERROR_BASELINE);
  });
});
