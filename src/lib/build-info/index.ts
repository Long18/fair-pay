import { APP_BASE_VERSION } from "./base-version";

export const BUILD_INFO_TIMEZONE = "Asia/Ho_Chi_Minh";
export const BUILD_INFO_ENV_KEY = "VITE_APP_BUILD_INFO";

export type BuildChannel = "production" | "preview" | "local";

export interface BuildInfo {
  version: string;
  baseVersion: string;
  dateCode: string;
  sequence: number | null;
  channel: BuildChannel;
  builtAt: string;
  deploymentId: string | null;
  commitSha: string | null;
}

export type ParsedBuildVersion =
  | {
      kind: "deployed";
      baseVersion: string;
      dateCode: string;
      sequence: number;
    }
  | {
      kind: "local";
      baseVersion: string;
      localStamp: string;
    };

interface VietnamTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  dateCode: string;
  localStamp: string;
}

const DEPLOYED_VERSION_PATTERN =
  /^(?<baseVersion>\d+\.\d+\.\d+)-(?<dateCode>\d{6})(?<sequence>\d{2,})$/;
const LOCAL_VERSION_PATTERN =
  /^(?<baseVersion>\d+\.\d+\.\d+)-local-(?<localStamp>\d{10,})$/;

function getVietnamFormatterParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUILD_INFO_TIMEZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return parts.reduce<Record<string, string>>((lookup, part) => {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }

    return lookup;
  }, {});
}

export function getVietnamTimeParts(date: Date = new Date()): VietnamTimeParts {
  const lookup = getVietnamFormatterParts(date);

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
    dateCode: `${lookup.year}${lookup.month}${lookup.day}`,
    localStamp: `${lookup.year}${lookup.month}${lookup.day}${lookup.hour}${lookup.minute}`,
  };
}

export function formatBuildSequence(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error(`Invalid build sequence: ${sequence}`);
  }

  return sequence < 100 ? sequence.toString().padStart(2, "0") : String(sequence);
}

export function formatDeployedBuildVersion(input: {
  baseVersion: string;
  dateCode: string;
  sequence: number;
}): string {
  return `${input.baseVersion}-${input.dateCode}${formatBuildSequence(input.sequence)}`;
}

export function formatLocalBuildVersion(input: {
  baseVersion: string;
  localStamp: string;
}): string {
  return `${input.baseVersion}-local-${input.localStamp}`;
}

export function parseBuildVersion(version: string): ParsedBuildVersion | null {
  const deployedMatch = version.match(DEPLOYED_VERSION_PATTERN);
  if (deployedMatch?.groups) {
    return {
      kind: "deployed",
      baseVersion: deployedMatch.groups.baseVersion,
      dateCode: deployedMatch.groups.dateCode,
      sequence: Number(deployedMatch.groups.sequence),
    };
  }

  const localMatch = version.match(LOCAL_VERSION_PATTERN);
  if (localMatch?.groups) {
    return {
      kind: "local",
      baseVersion: localMatch.groups.baseVersion,
      localStamp: localMatch.groups.localStamp,
    };
  }

  return null;
}

export function formatVietnamBuiltAt(date: Date = new Date()): string {
  const parts = getVietnamTimeParts(date);

  return `20${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function isBuildChannel(value: unknown): value is BuildChannel {
  return value === "production" || value === "preview" || value === "local";
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function coerceBuildInfo(value: unknown): BuildInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BuildInfo>;
  if (
    typeof candidate.version !== "string" ||
    typeof candidate.baseVersion !== "string" ||
    typeof candidate.dateCode !== "string" ||
    typeof candidate.builtAt !== "string" ||
    !isBuildChannel(candidate.channel)
  ) {
    return null;
  }

  if (candidate.sequence !== null && typeof candidate.sequence !== "number") {
    return null;
  }

  return {
    version: candidate.version,
    baseVersion: candidate.baseVersion,
    dateCode: candidate.dateCode,
    sequence: candidate.sequence ?? null,
    channel: candidate.channel,
    builtAt: candidate.builtAt,
    deploymentId: normalizeNullableString(candidate.deploymentId),
    commitSha: normalizeNullableString(candidate.commitSha),
  };
}

export function parseSerializedBuildInfo(rawValue?: string): BuildInfo | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return coerceBuildInfo(parsed);
  } catch {
    return null;
  }
}

export function createLocalBuildInfo(
  date: Date = new Date(),
  options: {
    versionSuffix?: string;
    commitSha?: string | null;
  } = {}
): BuildInfo {
  const parts = getVietnamTimeParts(date);
  const versionSuffix = options.versionSuffix ?? parts.localStamp;
  const version =
    versionSuffix === "dev"
      ? `${APP_BASE_VERSION}-local-dev`
      : formatLocalBuildVersion({
          baseVersion: APP_BASE_VERSION,
          localStamp: versionSuffix,
        });

  return {
    version,
    baseVersion: APP_BASE_VERSION,
    dateCode: parts.dateCode,
    sequence: null,
    channel: "local",
    builtAt: formatVietnamBuiltAt(date),
    deploymentId: null,
    commitSha: options.commitSha ?? null,
  };
}

export function isNewBuildAvailable(
  remoteBuildInfo: BuildInfo,
  currentInfo: BuildInfo = currentBuildInfo
): boolean {
  return remoteBuildInfo.version !== currentInfo.version;
}

export function resolveCurrentBuildInfo(): BuildInfo {
  const fromEnv = parseSerializedBuildInfo(import.meta.env.VITE_APP_BUILD_INFO);
  if (fromEnv) {
    return fromEnv;
  }

  return createLocalBuildInfo(new Date(), { versionSuffix: "dev" });
}

export const currentBuildInfo = resolveCurrentBuildInfo();
