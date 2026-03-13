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

function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
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
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for preview/production builds"
    );
  }

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
