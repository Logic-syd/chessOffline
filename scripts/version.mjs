import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const FILES = ["VERSION", "dist/index.html", "dist/sw.js", "CHANGELOG.md"];
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$(?![\s\S])/;
const UNRELEASED = "## [Unreleased]\n\n";
const CACHE_DECLARATION = 'const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;';
const USAGE = '用法：node scripts/version.mjs --check 或 node scripts/version.mjs patch|minor|major "更新说明"';

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseArguments(args) {
  if (args.length === 1 && args[0] === "--check") return { check: true };
  requireCondition(args.length === 2 && ["patch", "minor", "major"].includes(args[0]), USAGE);
  const summary = args[1].trim();
  requireCondition(summary.length > 0 && !/[\r\n\u2028\u2029]/.test(args[1]), "更新说明必须是非空的单行文本。");
  return { check: false, kind: args[0], summary };
}

export function nextVersion(version, kind) {
  requireCondition(VERSION_PATTERN.test(version), "VERSION 必须是 x.y.z 格式，不含 v 前缀、前导零或预发布后缀。");
  requireCondition(["patch", "minor", "major"].includes(kind), "升级类型必须是 patch、minor 或 major。");
  const [major, minor, patch] = version.split(".").map(BigInt);
  if (kind === "major") return `${major + 1n}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1n}.0`;
  return `${major}.${minor}.${patch + 1n}`;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateFiles(files) {
  const version = files.VERSION.replace(/\r?\n$/, "");
  requireCondition(VERSION_PATTERN.test(version), "VERSION 必须是 x.y.z 格式，不含 v 前缀、前导零或预发布后缀。");

  const html = files["dist/index.html"];
  const htmlMarkers = [...html.matchAll(/<span id="appVersion">v([^<]+)<\/span>/g)];
  const htmlIds = [...html.matchAll(/\bid\s*=\s*["']appVersion["']/g)];
  requireCondition(htmlMarkers.length === 1 && htmlIds.length === 1 && htmlMarkers[0][1] === version,
    `dist/index.html 必须且只能包含一个 <span id="appVersion">v${version}</span>。`);

  const worker = files["dist/sw.js"];
  const workerVersions = [...worker.matchAll(/const APP_VERSION = "([^"]+)";/g)];
  requireCondition(workerVersions.length === 1 && [...worker.matchAll(/\bconst\s+APP_VERSION\b/g)].length === 1 && workerVersions[0][1] === version,
    `dist/sw.js 必须且只能包含一个 const APP_VERSION = "${version}";。`);
  requireCondition(worker.split(CACHE_DECLARATION).length === 2 && [...worker.matchAll(/\bconst\s+CACHE_NAME\b/g)].length === 1,
    "dist/sw.js 的 CACHE_NAME 必须由 CACHE_PREFIX 和 APP_VERSION 生成。");

  const changelog = files["CHANGELOG.md"];
  requireCondition(changelog.split(UNRELEASED).length === 2 && [...changelog.matchAll(/^## \[Unreleased\]$/gm)].length === 1,
    "CHANGELOG.md 必须且只能包含一个 ## [Unreleased]，后面留一空行。");
  const escapedVersion = version.replaceAll(".", "\\.");
  const releases = [...changelog.matchAll(new RegExp(`^## \\[${escapedVersion}\\] - (\\d{4}-\\d{2}-\\d{2})$`, "gm"))];
  requireCondition(releases.length === 1 && isDate(releases[0][1]), `CHANGELOG.md 必须包含唯一且日期有效的 ## [${version}] - YYYY-MM-DD 标题。`);
  return version;
}

export function run(args, root = PROJECT_ROOT, date = new Date().toISOString().slice(0, 10)) {
  const options = parseArguments(args);
  const files = Object.fromEntries(FILES.map(name => {
    try {
      return [name, readFileSync(resolve(root, name), "utf8")];
    } catch (error) {
      throw new Error(`无法读取 ${name}：${error.message}`);
    }
  }));
  const version = validateFiles(files);
  if (options.check) return `版本检查通过：v${version}（页面、离线缓存、更新日志一致）。`;

  requireCondition(isDate(date), "发布日期必须是有效的 YYYY-MM-DD 日期。");
  const next = nextVersion(version, options.kind);
  requireCondition(!new RegExp(`^## \\[${next.replaceAll(".", "\\.")}\\]`, "m").test(files["CHANGELOG.md"]),
    `CHANGELOG.md 已存在 v${next}，请先检查更新日志。`);
  const updated = {
    VERSION: `${next}\n`,
    "dist/index.html": files["dist/index.html"].replace(`<span id="appVersion">v${version}</span>`, `<span id="appVersion">v${next}</span>`),
    "dist/sw.js": files["dist/sw.js"].replace(`const APP_VERSION = "${version}";`, `const APP_VERSION = "${next}";`),
    "CHANGELOG.md": files["CHANGELOG.md"].replace(UNRELEASED, `${UNRELEASED}## [${next}] - ${date}\n\n- ${options.summary}\n\n`),
  };
  // 在修改任何文件前，先验证输入和完整的升级结果。
  validateFiles(updated);
  for (const name of FILES) writeFileSync(resolve(root, name), updated[name], "utf8");
  return `版本已升级：v${version} → v${next}。请检查改动并测试；此命令不会创建 Git 提交、标签或推送。`;
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (error) {
    console.error(`版本管理失败：${error.message}`);
    process.exitCode = 1;
  }
}
