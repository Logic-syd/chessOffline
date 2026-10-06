import assert from "node:assert/strict";
import test from "node:test";
import runtime from "../dist/runtime.js";

test("responsive controls move the same nodes, restore desktop order and keep focus", () => {
  const makeNode = name => ({
    name, children: [], parentElement: null,
    contains(child) { return child === this || this.children.some(node => node.contains(child)); },
    append(child) { this.insertBefore(child, null); },
    insertBefore(child, before) {
      if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
      const index = before ? this.children.indexOf(before) : this.children.length;
      assert.ok(index >= 0);
      this.children.splice(index, 0, child);
      child.parentElement = this;
    },
  });
  const [topbar, panel, language, status, moves, actions, install, undo] =
    ["topbar", "panel", "language", "status", "moves", "actions", "install", "undo"].map(makeNode);
  [language, status, moves, actions, install].forEach(node => panel.append(node));
  actions.append(undo);
  const focusCalls = [];
  undo.focus = options => focusCalls.push(options);
  const doc = {
    activeElement: undo,
    querySelector: selector => ({ ".topbar": topbar, ".control-panel": panel,
      ".language-control": language, ".status-card": status, ".actions": actions })[selector],
    getElementById: id => id === "installButton" ? install : null,
  };
  for (const compact of [true, false, true, false]) {
    runtime.placeResponsiveControls(doc, compact);
    assert.deepEqual(topbar.children.map(node => node.name), compact ? ["language"] : []);
    assert.deepEqual(panel.children.map(node => node.name), compact
      ? ["actions", "status", "moves", "install"]
      : ["language", "status", "moves", "actions", "install"]);
    assert.equal(actions.children[0], undo);
    assert.equal(language.parentElement, compact ? topbar : panel);
    assert.deepEqual(focusCalls.at(-1), { preventScroll: true });
  }
  doc.activeElement = null;
  runtime.placeResponsiveControls(doc, true);
  assert.equal(focusCalls.length, 4, "do not steal focus from unrelated content");
});

function clock() {
  let id = 0;
  const jobs = new Map();
  return {
    jobs,
    setTimer(fn) { jobs.set(++id, fn); return id; },
    clearTimer(key) { jobs.delete(key); },
    tick() { const pending = [...jobs.values()]; jobs.clear(); for (const fn of pending) fn(); },
  };
}

function audioFixture() {
  const contexts = [];
  class Audio {
    constructor() { this.currentTime = 0; this.state = "running"; this.closed = 0; contexts.push(this); }
    createOscillator() { return (this.oscillator = { frequency: {}, connect() {}, disconnect() {}, start() {}, stop() {} }); }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    close() { this.closed += 1; this.state = "closed"; return Promise.resolve(); }
  }
  const timers = clock();
  const vibrations = [];
  return { contexts, timers, vibrations, feedback: runtime.createFeedback({ audioClass: Audio, vibrate: value => vibrations.push(value), ...timers }) };
}

test("power saving creates no audio resources or haptics", () => {
  const { feedback, contexts, vibrations, timers } = audioFixture();
  feedback.play();
  assert.equal(contexts.length, 0);
  assert.deepEqual(vibrations, []);
  assert.equal(timers.jobs.size, 0);
});

test("sound ends with deterministic resource cleanup", () => {
  const { feedback, contexts, timers } = audioFixture();
  feedback.setEnabled(true);
  feedback.play();
  contexts[0].oscillator.onended();
  assert.equal(contexts[0].closed, 1);
  assert.equal(timers.jobs.size, 0);
  feedback.stop();
  assert.equal(contexts[0].closed, 1);
});

test("blocked sound and mode changes also close contexts", () => {
  const { feedback, contexts, timers } = audioFixture();
  feedback.setEnabled(true);
  feedback.play(true);
  timers.tick();
  assert.equal(contexts[0].closed, 1);
  feedback.play();
  feedback.setEnabled(false);
  assert.equal(contexts[1].closed, 1);
  assert.equal(timers.jobs.size, 0);
  feedback.play();
  assert.equal(contexts.length, 2);
});

test("unavailable or throwing audio never breaks gameplay", () => {
  const feedback = runtime.createFeedback({ audioClass: class { constructor() { throw new Error("denied"); } }, vibrate() { throw new Error("denied"); } });
  feedback.setEnabled(true);
  assert.doesNotThrow(() => feedback.play());
  assert.doesNotThrow(() => feedback.stop());
});

test("hidden page cancels a pending turn; return schedules exactly one", () => {
  const timers = clock();
  let visible = true;
  let runs = 0;
  const waiting = [];
  const scheduler = runtime.createTurnScheduler({ canRun: () => true, isVisible: () => visible, run: () => { runs += 1; }, onWaiting: value => waiting.push(value), ...timers });
  scheduler.schedule();
  const staleCallback = [...timers.jobs.values()][0];
  visible = false;
  scheduler.cancel();
  staleCallback();
  scheduler.schedule();
  timers.tick();
  assert.equal(runs, 0);
  assert.equal(timers.jobs.size, 0);
  visible = true;
  scheduler.schedule();
  scheduler.schedule();
  assert.equal(timers.jobs.size, 1);
  timers.tick();
  assert.equal(runs, 1);
  assert.equal(waiting.at(-1), false);
});

test("turn eligibility and visibility are checked again before computation", () => {
  const timers = clock();
  let eligible = true;
  let visible = true;
  let runs = 0;
  const scheduler = runtime.createTurnScheduler({ canRun: () => eligible, isVisible: () => visible, run: () => { runs += 1; }, onWaiting() {}, ...timers });
  scheduler.schedule();
  eligible = false;
  timers.tick();
  assert.equal(runs, 0);
  eligible = true;
  scheduler.schedule();
  visible = false;
  timers.tick();
  assert.equal(runs, 0);
});
