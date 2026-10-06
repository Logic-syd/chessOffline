import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { MESSAGES, preferredLocale, createI18n } = require("../dist/i18n.js");
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");

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

test("install help is browser-neutral and requires an offline check in every language", () => {
  assert.doesNotMatch(app, /navigator\.userAgent|install\.instructions\.(?:ios|other)/);
  const [, key, fallback] = html.match(/id="installInstructions" data-i18n="([^"]+)">([^<]+)</);
  assert.equal(key, "install.instructions");
  assert.equal(fallback, MESSAGES.zh[key]);
  for (const [locale, messages] of Object.entries(MESSAGES)) {
    assert.deepEqual(Object.keys(messages).filter(name => name.startsWith("install.instructions")), [key]);
    assert.doesNotMatch(messages[key], /Safari|Chrome|Firefox|Edge|iPhone|iPad/i, locale);
    assert.ok(messages[key].includes(messages["offline.check"]), locale);
    assert.match(messages[key], /飞行模式|airplane mode|Flugmodus/);
    assert.match(messages[key], /关闭 Wi-Fi|Wi-Fi off|ausgeschaltetem WLAN/);
  }
});

test("install help follows normal translation updates, including an open dialog", () => {
  const instructions = { dataset: { i18n: "install.instructions" }, textContent: "" };
  const dialog = { open: true };
  const doc = {
    documentElement: {},
    querySelector: () => null,
    querySelectorAll: selector => selector === "[data-i18n]" ? [instructions] : [],
    getElementById: id => id === "installDialog" ? dialog : null,
  };
  const i18n = createI18n("zh", []);
  for (const locale of ["zh", "en", "de", "zh"]) {
    i18n.setLocale(locale);
    i18n.apply(doc);
    assert.equal(instructions.textContent, MESSAGES[locale]["install.instructions"]);
    assert.equal(dialog.open, true);
  }
});

test("offline results translate from stable codes without changing their data", () => {
  const status = { state: "missing", code: "incomplete", count: 2, missing: ["a", "b"], message: "原始中文消息" };
  const i18n = createI18n("en", []);
  assert.match(i18n.offlineMessage(status), /2 missing/);
  assert.deepEqual(status.missing, ["a", "b"]);
  i18n.setLocale("zh");
  assert.match(i18n.offlineMessage(status), /缺少 2 项/);
});

test("German labels and move notation render without changing saved notation", () => {
  assert.equal(preferredLocale(undefined, ["de-DE", "en-US"]), "de");
  const i18n = createI18n("de", []);
  assert.equal(i18n.t("status.yourTurn"), "Du bist am Zug");
  assert.match(i18n.offlineMessage({ code: "incomplete", count: 3 }), /3 fehlen/);
  const saved = "Q×d7#";
  assert.equal(i18n.formatMoveNotation(saved), "D×d7#");
  assert.equal(i18n.formatMoveNotation("Nf3"), "Sf3");
  assert.equal(i18n.formatMoveNotation("e8=Q+"), "e8=D+");
  assert.equal(i18n.formatMoveNotation("O-O"), "O-O");
  assert.equal(saved, "Q×d7#");
  i18n.setLocale("en");
  assert.equal(i18n.formatMoveNotation(saved), saved);
});
