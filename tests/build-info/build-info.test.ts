import { APP_BASE_VERSION } from "@/lib/build-info/base-version";
import {
  coerceBuildInfo,
  formatBuildSequence,
  formatDeployedBuildVersion,
  formatLocalBuildVersion,
  formatVietnamBuiltAt,
  getVietnamTimeParts,
  parseBuildVersion,
} from "@/lib/build-info";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("build-info utilities", () => {
  it("uses package.json as the single source of truth for the base version", () => {
    expect(APP_BASE_VERSION).toBe(packageJson.version);
  });

  it("formats Vietnam timezone date parts and builtAt", () => {
    const referenceDate = new Date("2026-03-12T17:15:00.000Z");

    expect(getVietnamTimeParts(referenceDate)).toMatchObject({
      dateCode: "260313",
      localStamp: "2603130015",
    });
    expect(formatVietnamBuiltAt(referenceDate)).toBe("2026-03-13T00:15:00+07:00");
  });

  it("zero-pads build sequences up to 99", () => {
    expect(formatBuildSequence(1)).toBe("01");
    expect(formatBuildSequence(9)).toBe("09");
    expect(formatBuildSequence(10)).toBe("10");
    expect(
      formatDeployedBuildVersion({
        baseVersion: APP_BASE_VERSION,
        dateCode: "260313",
        sequence: 1,
      })
    ).toBe(`${APP_BASE_VERSION}-26031301`);
  });

  it("keeps expanding digits when the sequence exceeds 99", () => {
    expect(formatBuildSequence(100)).toBe("100");
    expect(
      formatDeployedBuildVersion({
        baseVersion: APP_BASE_VERSION,
        dateCode: "260313",
        sequence: 100,
      })
    ).toBe(`${APP_BASE_VERSION}-260313100`);
  });

  it("parses deployed build versions", () => {
    expect(parseBuildVersion(`${APP_BASE_VERSION}-26031301`)).toEqual({
      kind: "deployed",
      baseVersion: APP_BASE_VERSION,
      dateCode: "260313",
      sequence: 1,
    });
  });

  it("parses local build versions", () => {
    const version = formatLocalBuildVersion({
      baseVersion: APP_BASE_VERSION,
      localStamp: "2603130915",
    });

    expect(version).toBe(`${APP_BASE_VERSION}-local-2603130915`);
    expect(parseBuildVersion(version)).toEqual({
      kind: "local",
      baseVersion: APP_BASE_VERSION,
      localStamp: "2603130915",
    });
  });

  it("coerces a build info payload", () => {
    expect(
      coerceBuildInfo({
        version: `${APP_BASE_VERSION}-26031301`,
        baseVersion: APP_BASE_VERSION,
        dateCode: "260313",
        sequence: 1,
        channel: "production",
        builtAt: "2026-03-13T09:15:00+07:00",
        deploymentId: "dpl_xxx",
        commitSha: "abcdef1",
      })
    ).toEqual({
      version: `${APP_BASE_VERSION}-26031301`,
      baseVersion: APP_BASE_VERSION,
      dateCode: "260313",
      sequence: 1,
      channel: "production",
      builtAt: "2026-03-13T09:15:00+07:00",
      deploymentId: "dpl_xxx",
      commitSha: "abcdef1",
    });
  });
});
