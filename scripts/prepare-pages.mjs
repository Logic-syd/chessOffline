import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RELEASE_TAG = "v1.4.3";

export function preparePages(releaseRoot, testRoot, outputRoot) {
  const release = resolve(releaseRoot);
  const test = resolve(testRoot);
  const output = resolve(outputRoot);
  if (output === release || output === test || release.startsWith(`${output}/`) || test.startsWith(`${output}/`)) {
    throw new Error("Output must be separate from both source checkouts.");
  }
  for (const [label, root] of [["release", release], ["test", test]]) {
    if (!existsSync(join(root, "dist", "index.html")) || !existsSync(join(root, "dist", "sw.js"))) {
      throw new Error(`${label} checkout is missing the static game files.`);
    }
  }
  if (readFileSync(join(release, "VERSION"), "utf8").trim() !== RELEASE_TAG.slice(1)) {
    throw new Error(`Production checkout must be ${RELEASE_TAG}.`);
  }
  if (existsSync(output)) throw new Error("Output directory must not already exist.");
  mkdirSync(output, { recursive: true });
  cpSync(join(release, "dist"), join(output, "dist"), { recursive: true });
  cpSync(join(test, "dist"), join(output, "test"), { recursive: true });
  // The two paths share one origin. Namespacing test saves prevents routine test play
  // from overwriting the existing /dist/ release saves without changing the tagged build.
  const testAppPath = join(output, "test", "app.js");
  let testApp = readFileSync(testAppPath, "utf8");
  for (const [original, isolated] of [
    ['"kilimanjaro-chess-v1"', '"kilimanjaro-chess-test-v1"'],
    ['"kilimanjaro-chess-settings-v1"', '"kilimanjaro-chess-test-settings-v1"'],
  ]) {
    if (testApp.split(original).length !== 2) throw new Error(`Expected exactly one ${original} in test app.`);
    testApp = testApp.replace(original, isolated);
  }
  writeFileSync(testAppPath, testApp);
  writeFileSync(join(output, ".nojekyll"), "");
  writeFileSync(join(output, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=./dist/"><title>Bergschach — Offline Chess</title></head>
<body><p><a href="./dist/">Play Bergschach</a></p></body></html>
`);
  return { production: join(output, "dist"), test: join(output, "test") };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.length !== 5) {
    console.error("Usage: node scripts/prepare-pages.mjs RELEASE_CHECKOUT TEST_CHECKOUT OUTPUT_DIR");
    process.exitCode = 1;
  } else {
    try { console.log(preparePages(...process.argv.slice(2))); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
