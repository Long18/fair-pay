#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const baseVersionFilePath = resolve(
  projectRoot,
  "src/lib/build-info/base-version.ts"
);
const versionOutputPath = resolve(projectRoot, "dist/version.json");
const BUILD_INFO_TIMEZONE = "Asia/Ho_Chi_Minh";

function getVietnamTimeParts(date = new Date()) {
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

  const lookup = parts.reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

    return result;
  }, {});

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

function formatVietnamBuiltAt(date = new Date()) {
  const parts = getVietnamTimeParts(date);

  return `20${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function formatSequence(sequence) {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error(`Invalid build sequence: ${sequence}`);
  }

  return sequence < 100 ? String(sequence).padStart(2, "0") : String(sequence);
}

function formatDeployedVersion(baseVersion, dateCode, sequence) {
  return `${baseVersion}-${dateCode}${formatSequence(sequence)}`;
}

function formatLocalVersion(baseVersion, localStamp) {
  return `${baseVersion}-local-${localStamp}`;
}

async function readBaseVersion() {
  const fileContents = await readFile(baseVersionFilePath, "utf8");
  const match = fileContents.match(/APP_BASE_VERSION\s*=\s*"(?<version>\d+\.\d+\.\d+)"/);

  if (!match?.groups?.version) {
    throw new Error(
      `Unable to read APP_BASE_VERSION from ${baseVersionFilePath}`
    );
  }

  return match.groups.version;
}

function resolveChannel() {
  const vercelEnvironment = process.env.VERCEL_ENV;

  if (vercelEnvironment === "production") {
    return "production";
  }

  if (vercelEnvironment === "preview") {
    return "preview";
  }

  return "local";
}

async function runCommand(command, args, env) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });

    child.on("error", rejectPromise);
  });
}

async function captureCommand(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.on("exit", (code) => {
      resolvePromise(code === 0 ? stdout.trim() : "");
    });

    child.on("error", () => {
      resolvePromise("");
    });
  });
}

function getTrimmedEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getSupabaseProjectRef(url) {
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co(?:\/|$)/i);
  return match?.[1] ?? null;
}

function resolveSupabaseBuildCredentials() {
  const supabaseUrl = getTrimmedEnv("SUPABASE_URL");
  const publicSupabaseUrl = getTrimmedEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = getTrimmedEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for preview/production builds"
    );
  }

  const resolvedUrl = supabaseUrl || publicSupabaseUrl;
  if (!resolvedUrl) {
    throw new Error(
      "SUPABASE_URL or VITE_SUPABASE_URL is required for preview/production builds"
    );
  }

  if (supabaseUrl && publicSupabaseUrl && supabaseUrl !== publicSupabaseUrl) {
    const serverRef = getSupabaseProjectRef(supabaseUrl) ?? "unknown";
    const publicRef = getSupabaseProjectRef(publicSupabaseUrl) ?? "unknown";
    console.warn(
      `[build-version] SUPABASE_URL (${serverRef}) differs from VITE_SUPABASE_URL (${publicRef}); using SUPABASE_URL for build-time version allocation.`
    );
  }

  return {
    supabaseUrl: resolvedUrl,
    supabaseUrlSource: supabaseUrl ? "SUPABASE_URL" : "VITE_SUPABASE_URL",
    serviceRoleKey,
  };
}

function getCommitSha() {
  const explicitCommitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.COMMIT_SHA;

  if (explicitCommitSha) {
    return explicitCommitSha.slice(0, 7);
  }

  return captureCommand("git", ["rev-parse", "--short", "HEAD"]);
}

async function allocateRemoteBuildVersion({
  baseVersion,
  channel,
  builtAt,
  deploymentId,
  commitSha,
}) {
  const { supabaseUrl, supabaseUrlSource, serviceRoleKey } =
    resolveSupabaseBuildCredentials();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("allocate_app_build_version", {
    p_base_version: baseVersion,
    p_channel: channel,
    p_tz: BUILD_INFO_TIMEZONE,
  });

  if (error) {
    if (error.message === "Invalid API key") {
      const projectRef = getSupabaseProjectRef(supabaseUrl) ?? "unknown";
      throw new Error(
        `Invalid SUPABASE_SERVICE_ROLE_KEY for project ${projectRef}. Build-time version allocation is using ${supabaseUrlSource}. Ensure SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY belong to the same Supabase project on Vercel.`
      );
    }

    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Supabase RPC did not return a build version payload");
  }

  if (
    typeof row.version !== "string" ||
    typeof row.date_code !== "string" ||
    typeof row.sequence !== "number"
  ) {
    throw new Error("Supabase RPC returned an invalid build version payload");
  }

  return {
    version: row.version,
    baseVersion,
    dateCode: row.date_code,
    sequence: row.sequence,
    channel,
    builtAt,
    deploymentId,
    commitSha: commitSha || null,
  };
}

async function createBuildInfo() {
  const baseVersion = await readBaseVersion();
  const channel = resolveChannel();
  const now = new Date();
  const parts = getVietnamTimeParts(now);
  const builtAt = formatVietnamBuiltAt(now);
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const commitSha = await getCommitSha();

  if (channel === "local") {
    return {
      version: formatLocalVersion(baseVersion, parts.localStamp),
      baseVersion,
      dateCode: parts.dateCode,
      sequence: null,
      channel,
      builtAt,
      deploymentId,
      commitSha: commitSha || null,
    };
  }

  return allocateRemoteBuildVersion({
    baseVersion,
    channel,
    builtAt,
    deploymentId,
    commitSha,
  });
}

async function writeVersionArtifact(buildInfo) {
  await mkdir(resolve(projectRoot, "dist"), { recursive: true });
  await writeFile(`${versionOutputPath}`, `${JSON.stringify(buildInfo, null, 2)}\n`);
}

async function main() {
  const buildInfo = await createBuildInfo();
  const buildEnv = {
    ...process.env,
    VITE_APP_VERSION: buildInfo.version,
    VITE_APP_BUILD_INFO: JSON.stringify(buildInfo),
  };

  console.log(`[build-version] Building ${buildInfo.version} (${buildInfo.channel})`);

  await runCommand("pnpm", ["exec", "tsc"], buildEnv);
  await runCommand("pnpm", ["exec", "refine", "build"], buildEnv);
  await writeVersionArtifact(buildInfo);

  console.log(`[build-version] Wrote dist/version.json for ${buildInfo.version}`);
}

main().catch((error) => {
  console.error("[build-version] Build failed:", error);
  process.exit(1);
});
