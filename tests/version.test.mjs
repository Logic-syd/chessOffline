import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { nextVersion, parseArguments, run } from "../scripts/version.mjs";

const initial = {
  VERSION: "1.2.3\n",
  "dist/index.html": '<html><span id="appVersion">v1.2.3</span></html>\n',
  "dist/sw.js": 'const CACHE_PREFIX = "kilimanjaro-chess-";\nconst APP_VERSION = "1.2.3";\nconst CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;\n',
  "CHANGELOG.md": "# 更新日志\n\n## [Unreleased]\n\n## [1.2.3] - 2026-10-04\n\n- 原有功能。\n\n## [1.2.2] - 2026-10-01\n\n- 更早的更新。\n",
};

const fixtureRoots = [];
// Node 16 的 test context 没有 after；退出时仅清理本进程创建的临时目录。
process.on("exit", () => {
  for (const root of fixtureRoots) rmSync(root, { recursive: true, force: true });
});

function fixture(_t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "chess-version-test-"));
  fixtureRoots.push(root);
  mkdirSync(join(root, "dist"));
  for (const [name, contents] of Object.entries({ ...initial, ...overrides })) {
    writeFileSync(join(root, name), contents);
  }
  return root;
}

function snapshot(root) {
  return Object.fromEntries(Object.keys(initial).map(name => [name, readFileSync(join(root, name), "utf8")]));
}

test("--check validates matching versions without writing", t => {
  const root = fixture(t);
  assert.match(run(["--check"], root), /版本检查通过：v1\.2\.3/);
  assert.deepEqual(snapshot(root), initial);
});

for (const [kind, expected] of [["patch", "1.2.4"], ["minor", "1.3.0"], ["major", "2.0.0"]]) {
  test(`${kind} updates all versioned files and preserves old changelog`, t => {
    const root = fixture(t);
    const summary = "修复离线体验";
    assert.match(run([kind, ` ${summary} `], root, "2026-10-05"), /版本已升级/);
    const result = snapshot(root);
    assert.equal(result.VERSION, `${expected}\n`);
    assert.equal(result["dist/index.html"], initial["dist/index.html"].replace("v1.2.3", `v${expected}`));
    assert.equal(result["dist/sw.js"], initial["dist/sw.js"].replace('"1.2.3"', `"${expected}"`));
    assert.equal(result["CHANGELOG.md"], initial["CHANGELOG.md"].replace("## [Unreleased]\n\n", `## [Unreleased]\n\n## [${expected}] - 2026-10-05\n\n- ${summary}\n\n`));
    assert.match(run(["--check"], root), /版本检查通过/);
  });
}

test("version arithmetic supports zero and does not lose integer precision", () => {
  assert.equal(nextVersion("0.0.0", "patch"), "0.0.1");
  assert.equal(nextVersion("9007199254740993.2.3", "major"), "9007199254740994.0.0");
});

test("invalid arguments and summaries fail before writing", t => {
  const root = fixture(t);
  const invalid = [[], ["--help"], ["--check", "extra"], ["patch"], ["patch", "a", "b"], ["release", "说明"], ["patch", ""], ["patch", "  "], ["minor", "第一行\n第二行"], ["major", "说明\r"], ["patch", "说明\u2028其他"]];
  for (const args of invalid) {
    assert.throws(() => parseArguments(args));
    assert.throws(() => run(args, root));
    assert.deepEqual(snapshot(root), initial);
  }
});

test("invalid VERSION formats fail before writing", async t => {
  for (const version of ["v1.2.3", "01.2.3", "1.02.3", "1.2.03", "1.2", "1.2.3-beta", "1.2.3+build", "-1.2.3", "1.2.3\n\n", " 1.2.3", "1.2.3 "]) {
    await t.test(JSON.stringify(version), t => {
      const root = fixture(t, { VERSION: version });
      const before = snapshot(root);
      assert.throws(() => run(["patch", "说明"], root), /VERSION 必须/);
      assert.deepEqual(snapshot(root), before);
    });
  }
});

test("inconsistent files are rejected without partial version updates", async t => {
  const mutations = [
    ["missing HTML marker", "dist/index.html", "<html></html>"],
    ["wrong HTML version", "dist/index.html", initial["dist/index.html"].replace("v1.2.3", "v1.2.4")],
    ["duplicate HTML marker", "dist/index.html", initial["dist/index.html"].repeat(2)],
    ["duplicate HTML id", "dist/index.html", `${initial["dist/index.html"]}<span id='appVersion'>v1.2.3</span>`],
    ["wrong worker version", "dist/sw.js", initial["dist/sw.js"].replace('"1.2.3"', '"1.2.4"')],
    ["duplicate worker declaration", "dist/sw.js", `${initial["dist/sw.js"]}const APP_VERSION = "1.2.3";`],
    ["hardcoded cache version", "dist/sw.js", initial["dist/sw.js"].replace("v${APP_VERSION}", "v1.2.3")],
    ["duplicate cache declaration", "dist/sw.js", `${initial["dist/sw.js"]}const CACHE_NAME = "other";`],
    ["missing release heading", "CHANGELOG.md", initial["CHANGELOG.md"].replace("[1.2.3]", "[1.2.4]")],
    ["invalid release date", "CHANGELOG.md", initial["CHANGELOG.md"].replace("2026-10-04", "2026-02-30")],
    ["duplicate current release", "CHANGELOG.md", `${initial["CHANGELOG.md"]}\n## [1.2.3] - 2026-10-04\n`],
    ["missing unreleased", "CHANGELOG.md", initial["CHANGELOG.md"].replace("## [Unreleased]\n\n", "")],
    ["duplicate unreleased", "CHANGELOG.md", `## [Unreleased]\n\n${initial["CHANGELOG.md"]}`],
    ["next version already recorded", "CHANGELOG.md", `${initial["CHANGELOG.md"]}\n## [1.2.4] - 2026-10-04\n`],
  ];
  for (const [name, file, contents] of mutations) {
    await t.test(name, t => {
      const root = fixture(t, { [file]: contents });
      const before = snapshot(root);
      assert.throws(() => run(["patch", "说明"], root));
      assert.deepEqual(snapshot(root), before);
    });
  }
});

test("invalid target date fails without writing", t => {
  const root = fixture(t);
  assert.throws(() => run(["patch", "说明"], root, "2026-02-30"), /发布日期/);
  assert.deepEqual(snapshot(root), initial);
});

test("CLI resolves the project from its script path, not the working directory", t => {
  const root = fixture(t);
  const otherRoot = fixture(t, { VERSION: "invalid" });
  mkdirSync(join(root, "scripts"));
  const script = join(root, "scripts/version.mjs");
  copyFileSync(new URL("../scripts/version.mjs", import.meta.url), script);
  const result = spawnSync(process.execPath, [script, "patch", "命令行测试"], { cwd: otherRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /v1\.2\.3 → v1\.2\.4/);
  assert.equal(snapshot(root).VERSION, "1.2.4\n");
  assert.equal(snapshot(otherRoot).VERSION, "invalid");
  const failed = spawnSync(process.execPath, [script, "patch"], { cwd: otherRoot, encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /版本管理失败/);
});
