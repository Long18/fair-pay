#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HOME = os.homedir();
const GITNEXUS_DIR = path.join(HOME, ".gitnexus");
const GROUPS_DIR = path.join(GITNEXUS_DIR, "groups");
const REGISTRY_PATH = path.join(GITNEXUS_DIR, "registry.json");
const API_BASE = "http://127.0.0.1:4747";

function usage() {
  console.log(`Usage:
  gitnexus-group create <name>
  gitnexus-group add <name> <repo>
  gitnexus-group remove <name> <repo>
  gitnexus-group list [name]
  gitnexus-group sync <name>
  gitnexus-group contracts <name>
  gitnexus-group query <name> <query>
  gitnexus-group status <name>`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function groupFile(name) {
  return path.join(GROUPS_DIR, `${name}.json`);
}

function contractsFile(name) {
  return path.join(GROUPS_DIR, `${name}.contracts.json`);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureGroupsDir() {
  await fs.mkdir(GROUPS_DIR, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readRegistry() {
  return readJson(REGISTRY_PATH, []);
}

async function readGroup(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    fail("Group name is required.");
  }

  const data = await readJson(groupFile(normalized));
  if (!data) {
    fail(`Group "${normalized}" does not exist.`);
  }
  return data;
}

async function saveGroup(group) {
  const normalized = normalizeName(group.name);
  const now = new Date().toISOString();
  const payload = {
    version: 1,
    name: normalized,
    repos: [...new Set(group.repos || [])].sort(),
    createdAt: group.createdAt || now,
    updatedAt: now,
  };

  await ensureGroupsDir();
  await writeJson(groupFile(normalized), payload);
  return payload;
}

async function resolveRepo(repoName) {
  const registry = await readRegistry();
  const exact = registry.find((repo) => repo.name === repoName);
  if (exact) {
    return exact;
  }

  const lower = repoName.toLowerCase();
  const fuzzy = registry.find((repo) => repo.name.toLowerCase() === lower);
  if (fuzzy) {
    return fuzzy;
  }

  fail(`Repository "${repoName}" is not registered in ${REGISTRY_PATH}.`);
}

async function listGroups(name) {
  await ensureGroupsDir();
  if (name) {
    console.log(JSON.stringify(await readGroup(name), null, 2));
    return;
  }

  const files = await fs.readdir(GROUPS_DIR).catch(() => []);
  const groups = [];
  for (const file of files) {
    if (!file.endsWith(".json") || file.endsWith(".contracts.json")) {
      continue;
    }

    const data = await readJson(path.join(GROUPS_DIR, file));
    if (data) {
      groups.push(data);
    }
  }

  console.log(JSON.stringify(groups.sort((a, b) => a.name.localeCompare(b.name)), null, 2));
}

async function createGroup(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    fail("Group name is required.");
  }
  if (await fileExists(groupFile(normalized))) {
    fail(`Group "${normalized}" already exists.`);
  }

  const group = await saveGroup({ name: normalized, repos: [] });
  console.log(JSON.stringify(group, null, 2));
}

async function addRepo(name, repoName) {
  const group = await readGroup(name);
  const repo = await resolveRepo(repoName);
  group.repos = [...new Set([...(group.repos || []), repo.name])];
  console.log(JSON.stringify(await saveGroup(group), null, 2));
}

async function removeRepo(name, repoName) {
  const group = await readGroup(name);
  const repo = await resolveRepo(repoName);
  group.repos = (group.repos || []).filter((value) => value !== repo.name);
  console.log(JSON.stringify(await saveGroup(group), null, 2));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}

async function apiGet(endpoint, repoName) {
  const url = `${API_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}repo=${encodeURIComponent(repoName)}`;
  return fetchJson(url);
}

async function getRepoHead(repoPath) {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoPath });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function collectDocs(repoPath) {
  const docsDir = path.join(repoPath, "docs");
  const results = [];

  async function walk(dir, prefix) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, relative);
      } else {
        results.push(relative);
      }
    }
  }

  await walk(docsDir, "docs");
  return results.sort();
}

async function collectFiles(repoPath, relativeDir) {
  const results = [];

  async function walk(dir, prefix) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, relative);
      } else {
        results.push(relative);
      }
    }
  }

  await walk(path.join(repoPath, relativeDir), relativeDir);
  return results.sort();
}

function toKeywordSet(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4),
  );
}

function intersectSize(left, right) {
  let matches = 0;
  for (const token of left) {
    if (right.has(token)) {
      matches += 1;
    }
  }
  return matches;
}

function buildCrossLinks(repos) {
  const links = [];
  for (let i = 0; i < repos.length; i += 1) {
    for (let j = i + 1; j < repos.length; j += 1) {
      const a = repos[i];
      const b = repos[j];
      const pairs = [];

      for (const contractA of a.contracts) {
        const setA = toKeywordSet(contractA.summary);
        if (setA.size === 0) {
          continue;
        }

        for (const contractB of b.contracts) {
          if (contractA.type !== contractB.type) {
            continue;
          }
          const setB = toKeywordSet(contractB.summary);
          const overlap = intersectSize(setA, setB);
          if (overlap >= 2) {
            pairs.push({
              left: contractA.summary,
              right: contractB.summary,
              type: contractA.type,
              overlap,
            });
          }
        }
      }

      if (pairs.length > 0) {
        links.push({
          repos: [a.name, b.name],
          links: pairs.sort((x, y) => y.overlap - x.overlap).slice(0, 10),
        });
      }
    }
  }
  return links;
}

function sample(items, size) {
  return items.slice(0, size);
}

async function buildRepoSnapshot(repoName) {
  const registryRepo = await resolveRepo(repoName);
  const [repoInfo, clustersPayload, processesPayload, docs, apiFiles] = await Promise.all([
    apiGet("/api/repo", repoName),
    apiGet("/api/clusters", repoName),
    apiGet("/api/processes", repoName),
    collectDocs(registryRepo.path),
    collectFiles(registryRepo.path, "api"),
  ]);

  const topClusters = sample((clustersPayload.clusters || []).sort((a, b) => b.symbolCount - a.symbolCount), 15);
  const topProcesses = sample((processesPayload.processes || []).sort((a, b) => b.stepCount - a.stepCount), 40);

  const contracts = [
    ...apiFiles.map((file) => ({ type: "api-file", summary: file })),
    ...docs
      .filter((file) => /api|contract|guide|roadmap|integration|payment|debt/i.test(file))
      .slice(0, 20)
      .map((file) => ({ type: "doc", summary: file })),
    ...topClusters.map((cluster) => ({
      type: "cluster",
      summary: `${cluster.heuristicLabel || cluster.label} (${cluster.symbolCount} symbols)`,
    })),
    ...topProcesses.map((process) => ({
      type: "process",
      summary: `${process.heuristicLabel || process.label} [${process.processType}, ${process.stepCount} steps]`,
    })),
  ];

  return {
    name: registryRepo.name,
    path: registryRepo.path,
    indexedAt: repoInfo.indexedAt,
    lastIndexedCommit: registryRepo.lastCommit,
    currentCommit: await getRepoHead(registryRepo.path),
    stats: repoInfo.stats,
    apiFiles,
    docs: sample(docs, 30),
    clusters: topClusters,
    processes: topProcesses,
    contracts,
  };
}

async function syncGroup(name) {
  const group = await readGroup(name);
  const repos = await Promise.all((group.repos || []).map((repoName) => buildRepoSnapshot(repoName)));
  const snapshot = {
    version: 1,
    group: group.name,
    syncedAt: new Date().toISOString(),
    repos,
    crossLinks: buildCrossLinks(repos),
  };

  await ensureGroupsDir();
  await writeJson(contractsFile(group.name), snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
}

async function readContracts(name) {
  const group = await readGroup(name);
  const filePath = contractsFile(group.name);
  const data = await readJson(filePath);
  if (!data) {
    fail(`No contracts snapshot found for "${group.name}". Run sync first.`);
  }
  return data;
}

async function showContracts(name) {
  console.log(JSON.stringify(await readContracts(name), null, 2));
}

function rankMatches(query, repo) {
  const needle = query.toLowerCase();
  const scored = [];
  for (const contract of repo.contracts || []) {
    const haystack = contract.summary.toLowerCase();
    if (!haystack.includes(needle)) {
      continue;
    }
    const score = haystack === needle ? 100 : haystack.startsWith(needle) ? 75 : 50;
    scored.push({ ...contract, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.summary.localeCompare(b.summary)).slice(0, 20);
}

async function queryGroup(name, query) {
  const snapshot = await readContracts(name);
  const results = snapshot.repos
    .map((repo) => ({
      repo: repo.name,
      matches: rankMatches(query, repo),
    }))
    .filter((entry) => entry.matches.length > 0);

  console.log(
    JSON.stringify(
      {
        group: snapshot.group,
        query,
        matchedRepos: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

async function statusGroup(name) {
  const group = await readGroup(name);
  const registry = await readRegistry();
  const statuses = await Promise.all(
    (group.repos || []).map(async (repoName) => {
      const repo = registry.find((entry) => entry.name === repoName);
      if (!repo) {
        return { repo: repoName, registered: false, stale: true, reason: "missing from registry" };
      }

      const currentCommit = await getRepoHead(repo.path);
      const stale = !currentCommit || currentCommit !== repo.lastCommit;
      return {
        repo: repo.name,
        registered: true,
        path: repo.path,
        indexedAt: repo.indexedAt,
        indexedCommit: repo.lastCommit,
        currentCommit,
        stale,
      };
    }),
  );

  console.log(JSON.stringify({ group: group.name, repos: statuses }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "create":
      if (args.length < 1) usage(), fail("Missing group name.");
      await createGroup(args[0]);
      break;
    case "add":
      if (args.length < 2) usage(), fail("Usage: add <name> <repo>");
      await addRepo(args[0], args[1]);
      break;
    case "remove":
      if (args.length < 2) usage(), fail("Usage: remove <name> <repo>");
      await removeRepo(args[0], args[1]);
      break;
    case "list":
      await listGroups(args[0]);
      break;
    case "sync":
      if (args.length < 1) usage(), fail("Usage: sync <name>");
      await syncGroup(args[0]);
      break;
    case "contracts":
      if (args.length < 1) usage(), fail("Usage: contracts <name>");
      await showContracts(args[0]);
      break;
    case "query":
      if (args.length < 2) usage(), fail("Usage: query <name> <query>");
      await queryGroup(args[0], args.slice(1).join(" "));
      break;
    case "status":
      if (args.length < 1) usage(), fail("Usage: status <name>");
      await statusGroup(args[0]);
      break;
    default:
      usage();
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
