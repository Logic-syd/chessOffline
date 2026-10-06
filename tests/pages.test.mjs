import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { preparePages, RELEASE_TAG } from "../scripts/prepare-pages.mjs";

test("Pages artifact keeps the tagged release and test branch at separate paths", () => {
  const temp = mkdtempSync(join(tmpdir(), "chess-pages-"));
  try {
    const release = join(temp, "release"), preview = join(temp, "preview"), output = join(temp, "site");
    for (const [root, marker] of [[release, "release"], [preview, "preview"]]) {
      mkdirSync(join(root, "dist"), { recursive: true });
      writeFileSync(join(root, "VERSION"), `${RELEASE_TAG.slice(1)}\n`);
      writeFileSync(join(root, "dist", "index.html"), marker);
      writeFileSync(join(root, "dist", "sw.js"), marker);
      writeFileSync(join(root, "dist", "app.js"), 'const STORAGE_KEY = "kilimanjaro-chess-v1"; const SETTINGS_KEY = "kilimanjaro-chess-settings-v1";');
    }
    preparePages(release, preview, output);
    assert.equal(readFileSync(join(output, "dist", "index.html"), "utf8"), "release");
    assert.equal(readFileSync(join(output, "test", "index.html"), "utf8"), "preview");
    assert.match(readFileSync(join(output, "test", "app.js"), "utf8"), /kilimanjaro-chess-test-v1/);
    assert.match(readFileSync(join(output, "test", "app.js"), "utf8"), /kilimanjaro-chess-test-settings-v1/);
    assert.doesNotMatch(readFileSync(join(output, "dist", "app.js"), "utf8"), /chess-test/);
    assert.match(readFileSync(join(output, "index.html"), "utf8"), /\.\/dist\//);
    assert.throws(() => preparePages(release, preview, output), /already exist/);
    writeFileSync(join(release, "VERSION"), "1.4.4\n");
    assert.throws(() => preparePages(release, preview, join(temp, "second")), /must be v1\.4\.3/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
