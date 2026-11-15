#!/usr/bin/env bash
set -euo pipefail

node --input-type=module <<'NODE'
import { existsSync, readFileSync, readdirSync } from "node:fs";

const problems = [];
const check = (condition, message) => {
  if (!condition) {
    problems.push(message);
  }
};

const readText = (path) => {
  if (!existsSync(path)) {
    problems.push(`missing ${path}`);
    return null;
  }
  return readFileSync(path, "utf8");
};

const readJson = (path) => {
  const text = readText(path);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    problems.push(`${path}: ${error.message}`);
    return null;
  }
};

const semver = /^\d+\.\d+\.\d+$/;

const rootPackage = readJson("package.json");
const config = readJson("release-please-config.json");
const manifest = readJson(".release-please-manifest.json");
const workflowPath = ".github/workflows/release-please.yml";
const workflow = readText(workflowPath);

if (rootPackage !== null && manifest !== null) {
  const version = manifest["."];
  check(
    typeof version === "string" && semver.test(version),
    '.release-please-manifest.json: "." must be a semver version',
  );
  check(
    version === rootPackage.version,
    `.release-please-manifest.json: "." (${String(version)}) must match package.json version (${String(rootPackage.version)})`,
  );
  check(rootPackage.private === true, "package.json: the root package must stay private");
}

if (config !== null) {
  const packages = config.packages ?? {};
  const names = Object.keys(packages);
  check(
    names.length === 1 && names[0] === ".",
    `release-please-config.json: exactly one root package (".") is expected, got ${JSON.stringify(names)}`,
  );

  const root = packages["."] ?? {};
  check(
    root["release-type"] === "node" || config["release-type"] === "node",
    'release-please-config.json: release type "node" is required',
  );
  check(
    !Array.isArray(config.plugins) || config.plugins.length === 0,
    "release-please-config.json: plugins are not allowed, they would version workspaces",
  );
  check(
    config["include-component-in-tag"] !== true,
    "release-please-config.json: tags must stay vX.Y.Z without a component prefix",
  );

  const serialized = JSON.stringify(config);
  check(
    !serialized.includes("main.tsp"),
    "release-please-config.json: the TypeSpec contract version must not be bumped automatically",
  );
  for (const workspace of ["api", "server", "web"]) {
    check(
      !serialized.includes(`"${workspace}"`),
      `release-please-config.json: ${workspace} must not be a release package`,
    );
  }
}

if (rootPackage !== null) {
  const workspaces = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];
  for (const workspace of workspaces) {
    const packageJson = readJson(`${workspace}/package.json`);
    if (packageJson === null) {
      continue;
    }
    check(
      packageJson.private === true,
      `${workspace}/package.json: workspace packages must stay private`,
    );
    check(
      packageJson.publishConfig === undefined,
      `${workspace}/package.json: publishConfig is not expected, nothing is published to npm`,
    );
  }
}

if (workflow !== null) {
  check(
    /googleapis\/release-please-action@[0-9a-f]{40}/.test(workflow),
    `${workflowPath}: googleapis/release-please-action must be pinned to a full commit SHA`,
  );
  check(
    !/googleapis\/release-please-action@v/.test(workflow),
    `${workflowPath}: the action must not be referenced by a tag`,
  );
  check(
    /pull-requests:\s*write/.test(workflow) && /contents:\s*write/.test(workflow),
    `${workflowPath}: permissions must allow contents and pull requests to be written`,
  );
  check(
    /branches:\s*\n\s*-\s*main\b/.test(workflow),
    `${workflowPath}: the workflow must run on push to main`,
  );
  check(
    !/\bnpm\s+publish\b|\bnpx\s+npm\s+publish\b/.test(workflow),
    `${workflowPath}: nothing may be published to npm`,
  );
}

const workflowsDir = ".github/workflows";
if (existsSync(workflowsDir)) {
  for (const file of readdirSync(workflowsDir)) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) {
      continue;
    }
    if (file === "hexlet-check.yml") {
      continue;
    }
    const text = readText(`${workflowsDir}/${file}`);
    check(
      text === null || !/\bnpm\s+publish\b/.test(text),
      `${workflowsDir}/${file}: nothing may be published to npm`,
    );
  }
}

if (problems.length > 0) {
  console.error("Release configuration is not consistent:");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log("Release configuration is consistent.");
NODE
