import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { MESSAGES, preferredLocale, createI18n } = require("../dist/i18n.js");
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

test("each language covers all interface and accessible-label keys", () => {
  const keys = Object.keys(MESSAGES.zh).sort();
  for (const messages of Object.values(MESSAGES)) assert.deepEqual(Object.keys(messages).sort(), keys);
  for (const [, key] of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) {
    assert.ok(Object.hasOwn(MESSAGES.zh, key), `Missing static label: ${key}`);
  }
});

test("saved choice wins over browser language, with English fallback", () => {
  assert.equal(preferredLocale("zh", ["en-US"]), "zh");
  assert.equal(preferredLocale(undefined, ["en-GB", "zh-CN"]), "en");
  assert.equal(preferredLocale(undefined, ["fr-FR"]), "en");
  const i18n = createI18n(undefined, ["en-US"]);
  assert.equal(i18n.t("moves.round", { count: 7 }), "Move 7");
  assert.equal(i18n.setLocale("zh"), true);
  assert.equal(i18n.t("moves.round", { count: 7 }), "第 7 回合");
});

test("offline results translate from stable codes without changing their data", () => {
  const status = { state: "missing", code: "incomplete", count: 2, missing: ["a", "b"], message: "原始中文消息" };
  const i18n = createI18n("en", []);
  assert.match(i18n.offlineMessage(status), /2 missing/);
  assert.deepEqual(status.missing, ["a", "b"]);
  i18n.setLocale("zh");
  assert.match(i18n.offlineMessage(status), /缺少 2 项/);
});
