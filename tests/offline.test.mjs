import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const offline = require("../dist/offline.js");
const workerSource = readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8");
const version = workerSource.match(/const APP_VERSION = "([^"]+)";/)[1];
const scope = "https://example.test/chess/";
const name = `${offline.scopePrefix(scope)}v${version}`;
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve(); };

function eventTarget() {
  const handlers = new Map();
  return {
    addEventListener(type, callback) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(callback);
    },
    emit(type, event = {}) { for (const callback of handlers.get(type) || []) callback(event); },
  };
}

function storageFixture() {
  const contents = new Map();
  let fetches = 0;
  function cacheFor(key) {
    if (!contents.has(key)) contents.set(key, new Map());
    const entries = contents.get(key);
    const urlOf = input => new URL(typeof input === "string" ? input : input.url, scope).href;
    return {
      async addAll(requests) {
        for (const request of requests) {
          fetches++;
          entries.set(urlOf(request), { ok: true, marker: urlOf(request) });
        }
      },
      async match(request) { return entries.get(urlOf(request)); },
    };
  }
  return {
    contents,
    get fetches() { return fetches; },
    storage: {
      async keys() { return [...contents.keys()]; },
      async open(key) { return cacheFor(key); },
      async delete(key) { return contents.delete(key); },
    },
    fill(key = name) {
      contents.set(key, new Map(offline.APP_SHELL.map(path => [new URL(path, scope).href, { ok: true, marker: path }])));
    },
  };
}

function browserFixture({ controlled = true, info, rejectRegister = false, secure = true } = {}) {
  const statuses = [], actions = [], ports = [];
  const controller = () => ({
    scriptURL: new URL("sw.js", scope).href,
    postMessage(message, channelPorts) {
      assert.equal(message.type, "CHESS_OFFLINE_CHECK");
      channelPorts[0].postMessage(info || { version, scope, missing: [] });
    },
  });
  const registration = { ...eventTarget(), installing: null };
  const sw = {
    ...eventTarget(),
    controller: controlled ? controller() : null,
    calls: 0,
    async register(url, options) {
      this.calls++;
      assert.equal(url, `${scope}sw.js`);
      assert.equal(options.scope, scope);
      assert.equal(options.updateViaCache, "none");
      if (rejectRegister) throw new Error("blocked");
      return registration;
    },
  };
  class Channel {
    constructor() {
      this.port1 = { closed: false, close() { this.closed = true; } };
      this.port2 = {
        closed: false,
        close() { this.closed = true; },
        postMessage: data => queueMicrotask(() => this.port1.onmessage({ data })),
      };
      ports.push(this.port1, this.port2);
    }
  }
  const env = {
    isSecureContext: secure,
    navigator: { serviceWorker: sw, onLine: false },
    location: { href: `${scope}index.html`, reload() { actions.push("reload"); } },
    MessageChannel: Channel,
    setTimeout,
    clearTimeout,
  };
  const options = { version, onStatus: state => statuses.push(state), beforeReload: () => actions.push("save") };
  return { env, sw, statuses, actions, ports, controller, registration, options, start: () => offline.start(options, env) };
}

test("shell includes every offline application file and all twelve pieces", () => {
  assert.equal(offline.APP_SHELL.length, 22);
  assert.equal(new Set(offline.APP_SHELL).size, 22);
  for (const path of offline.APP_SHELL) assert.ok(existsSync(new URL(`../dist/${path}`, import.meta.url)), `Missing file: ${path}`);
  for (const path of ["./", "./index.html", "./styles.css", "./app.js", "./offline.js", "./runtime.js", "./manifest.webmanifest", "./icon.svg", "./pieces/COPYING.txt", "./pieces/NOTICE.txt"]) {
    assert.ok(offline.APP_SHELL.includes(path), path);
  }
  assert.equal(offline.APP_SHELL.filter(path => /pieces\/.+\.svg$/.test(path)).length, 12);
});

test("cache inspection finds complete current scope without any network work", async () => {
  const fixture = storageFixture();
  fixture.fill();
  assert.deepEqual(await offline.inspectCache(fixture.storage, name, scope), []);
  assert.equal(fixture.fetches, 0);
});

test("one missing SVG is reported even when an old cache contains it", async () => {
  const fixture = storageFixture();
  fixture.fill();
  fixture.fill(`${offline.scopePrefix(scope)}v0.1.0`);
  fixture.contents.get(name).delete(`${scope}pieces/wK.svg`);
  assert.deepEqual(await offline.inspectCache(fixture.storage, name, scope), ["./pieces/wK.svg"]);
  assert.equal(fixture.fetches, 0);
});

test("absent current cache, invalid responses and rejected storage never claim readiness", async () => {
  const fixture = storageFixture();
  fixture.fill("unrelated");
  assert.deepEqual(await offline.inspectCache(fixture.storage, name, scope), offline.APP_SHELL);
  assert.equal(fixture.contents.has(name), false, "check must not create an empty cache");
  fixture.fill();
  fixture.contents.get(name).set(`${scope}pieces/bQ.svg`, { ok: false });
  assert.deepEqual(await offline.inspectCache(fixture.storage, name, scope), ["./pieces/bQ.svg"]);
  await assert.rejects(offline.inspectCache({ keys: async () => { throw new Error("blocked"); } }, name, scope), /blocked/);
});

test("a verified controller can report ready while navigator says offline", async () => {
  const fixture = browserFixture();
  const app = fixture.start();
  await flush();
  assert.equal((await app.check()).state, "ready");
  assert.equal(fixture.sw.calls, 1);
  assert.ok(fixture.ports.every(port => port.closed));
  assert.deepEqual(fixture.actions, []);
});

test("online status does not mask an incomplete, wrong-version or wrong-scope cache", async t => {
  for (const info of [
    { version, scope, missing: ["./pieces/bN.svg"] },
    { version: "0.0.0", scope, missing: [] },
    { version, scope: "https://example.test/elsewhere/", missing: [] },
  ]) {
    await t.test(JSON.stringify(info), async () => {
      const fixture = browserFixture({ info });
      fixture.env.navigator.onLine = true;
      const app = fixture.start();
      await flush();
      assert.equal((await app.check()).state, "missing");
    });
  }
});

test("unsupported environments and unrelated controllers cannot report ready", async () => {
  for (const kind of ["no-worker", "insecure", "foreign-worker"]) {
    const fixture = browserFixture();
    if (kind === "no-worker") delete fixture.env.navigator.serviceWorker;
    if (kind === "insecure") fixture.env.isSecureContext = false;
    if (kind === "foreign-worker") fixture.sw.controller.scriptURL = "https://example.test/sw.js";
    const app = fixture.start();
    await flush();
    assert.equal((await app.check()).state, kind === "foreign-worker" ? "missing" : "unsupported");
  }
});

test("registration failures and worker storage failures are visible", async () => {
  const blocked = browserFixture({ controlled: false, rejectRegister: true });
  const app = blocked.start();
  await flush();
  assert.equal((await app.check()).state, "error");
  const storageFailure = browserFixture({ info: { error: true } });
  const app2 = storageFailure.start();
  await flush();
  assert.equal((await app2.check()).state, "error");
  const cached = browserFixture({ rejectRegister: true });
  const app3 = cached.start();
  await flush();
  const status = await app3.check();
  assert.equal(status.state, "ready");
  assert.match(status.message, /更新检查未完成/);
});

test("first installation becomes ready after claim without reloading", async () => {
  const fixture = browserFixture({ controlled: false });
  fixture.start();
  await flush();
  assert.equal(fixture.statuses.at(-1).state, "missing");
  fixture.sw.controller = fixture.controller();
  fixture.sw.emit("controllerchange");
  await flush();
  assert.equal(fixture.statuses.at(-1).state, "ready");
  assert.deepEqual(fixture.actions, []);
});

test("an existing app saves once before reloading for an updated controller", async () => {
  const fixture = browserFixture();
  fixture.start();
  await flush();
  fixture.sw.controller = fixture.controller();
  fixture.sw.emit("controllerchange");
  fixture.sw.emit("controllerchange");
  await flush();
  assert.deepEqual(fixture.actions, ["save", "reload"]);
});

test("failed save blocks automatic update reload", async () => {
  const fixture = browserFixture();
  fixture.options.beforeReload = () => { throw new Error("quota"); };
  fixture.start();
  await flush();
  fixture.sw.controller = fixture.controller();
  fixture.sw.emit("controllerchange");
  await flush();
  assert.deepEqual(fixture.actions, []);
  assert.equal(fixture.statuses.at(-1).state, "error");
});

test("unresponsive registration and controller checks have bounded timers", async () => {
  const fixture = browserFixture();
  const pending = new Map();
  fixture.env.setTimeout = (callback, ms) => { pending.set(callback, ms); return callback; };
  fixture.env.clearTimeout = callback => pending.delete(callback);
  fixture.sw.register = () => new Promise(() => {});
  fixture.sw.controller.postMessage = () => {};
  fixture.start();
  await flush();
  assert.ok([...pending.values()].every(ms => ms <= 8000));
  for (const callback of [...pending.keys()]) callback();
  await flush();
  for (const callback of [...pending.keys()]) callback();
  await flush();
  assert.equal(fixture.statuses.at(-1).state, "error");
  assert.ok(fixture.ports.every(port => port.closed));
});

function workerFixture() {
  const fixture = storageFixture();
  const events = new Map();
  const actions = [];
  const self = {
    registration: { scope },
    addEventListener(type, callback) { events.set(type, callback); },
    async skipWaiting() { actions.push("skip"); },
    clients: { async claim() { actions.push("claim"); } },
  };
  const context = {
    self, caches: fixture.storage, ChessOffline: offline,
    importScripts(path) { assert.equal(path, "./offline.js"); },
    Request: class { constructor(path, options) { this.url = new URL(path, scope).href; assert.equal(options.cache, "reload"); } },
    fetch: async () => { throw new Error("offline"); },
  };
  vm.runInNewContext(workerSource, context);
  async function send(type, extra = {}) {
    let completion;
    events.get(type)({ ...extra, waitUntil(promise) { completion = promise; }, respondWith(promise) { completion = promise; } });
    return completion;
  }
  return { ...fixture, fixture, actions, send };
}

test("worker installs the shared shell and removes only its own old scoped caches", async () => {
  const worker = workerFixture();
  const oldName = `${offline.scopePrefix(scope)}v0.9.0`;
  const otherScope = `${offline.scopePrefix("https://example.test/another/")}v0.9.0`;
  for (const cacheName of [oldName, otherScope, "photo-cache", "kilimanjaro-chess-v1.0.0"]) worker.fixture.fill(cacheName);
  await worker.send("install");
  assert.equal(worker.fixture.fetches, offline.APP_SHELL.length);
  assert.deepEqual(worker.actions, ["skip"]);
  assert.deepEqual(await offline.inspectCache(worker.storage, name, scope), []);
  await worker.send("activate");
  assert.deepEqual(worker.actions, ["skip", "claim"]);
  assert.equal(worker.contents.has(oldName), false);
  for (const retained of [name, otherScope, "photo-cache", "kilimanjaro-chess-v1.0.0"]) assert.ok(worker.contents.has(retained), retained);
});

test("worker message checks cache without fetching and reports storage failures", async () => {
  const worker = workerFixture();
  worker.fixture.fill();
  const responses = [];
  const message = { data: { type: "CHESS_OFFLINE_CHECK" }, ports: [{ postMessage: value => responses.push(value) }] };
  await worker.send("message", message);
  assert.equal(responses[0].version, version);
  assert.equal(responses[0].scope, scope);
  assert.equal(responses[0].missing.length, 0);
  assert.equal(worker.fixture.fetches, 0);
  worker.storage.keys = async () => { throw new Error("blocked"); };
  await worker.send("message", message);
  assert.equal(responses[1].error, true);
});

test("worker preserves navigation fallback and leaves other scopes alone", async () => {
  const worker = workerFixture();
  worker.fixture.fill();
  const navigate = await worker.send("fetch", { request: { method: "GET", url: `${scope}?offline=1`, mode: "navigate" } });
  assert.equal(navigate.marker, "./index.html");
  assert.equal(await worker.send("fetch", { request: { method: "GET", url: "https://example.test/elsewhere/", mode: "navigate" } }), undefined);
  await assert.rejects(worker.send("fetch", { request: { method: "GET", url: `${scope}missing.svg`, mode: "no-cors" } }), /offline/);
});
