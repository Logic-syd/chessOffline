(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChessRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createFeedback({ audioClass, vibrate = () => {}, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    let enabled = false;
    const active = new Set();

    function stop() {
      for (const finish of [...active]) finish();
      try { vibrate(0); } catch (_) { /* Vibration is optional. */ }
    }

    function play(capture = false) {
      if (!enabled) return;
      try { vibrate(capture ? [12, 25, 12] : 12); } catch (_) { /* Optional feedback. */ }
      if (!audioClass) return;
      let context;
      let oscillator;
      let gain;
      let timer;
      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        active.delete(finish);
        if (timer !== undefined) clearTimer(timer);
        try { oscillator?.stop(); } catch (_) { /* It may already have ended. */ }
        try { oscillator?.disconnect(); gain?.disconnect(); } catch (_) { /* Best effort. */ }
        try { Promise.resolve(context?.close()).catch(() => {}); } catch (_) { /* Already closed. */ }
      }
      active.add(finish);
      try {
        context = new audioClass();
        oscillator = context.createOscillator();
        gain = context.createGain();
        oscillator.frequency.value = capture ? 270 : 390;
        gain.gain.setValueAtTime(0.025, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.07);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = finish;
        // Also close blocked/suspended contexts that never produce an ended event.
        timer = setTimer(finish, 500);
        if (context.state === "suspended") Promise.resolve(context.resume()).catch(finish);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.07);
      } catch (_) { finish(); }
    }

    return {
      play,
      stop,
      setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); },
    };
  }

  function createTurnScheduler({ canRun, isVisible, run, onWaiting, delay = () => 420 + Math.random() * 360, setTimer = setTimeout, clearTimer = clearTimeout }) {
    let timer = null;
    let generation = 0;
    let waiting = false;
    function markWaiting(value) {
      if (waiting === value) return;
      waiting = value;
      onWaiting(value);
    }
    function cancel() {
      generation += 1;
      if (timer !== null) clearTimer(timer);
      timer = null;
      markWaiting(false);
    }
    function schedule() {
      cancel();
      if (!isVisible() || !canRun()) return;
      const token = generation;
      markWaiting(true);
      timer = setTimer(() => {
        if (token !== generation) return;
        timer = null;
        markWaiting(false);
        if (isVisible() && canRun()) run();
      }, delay());
    }
    return { schedule, cancel };
  }

  // Move existing controls only at layout breakpoints: keep listeners, IDs and
  // keyboard order intact without a second set of buttons or a resize loop.
  function placeResponsiveControls(doc, compact) {
    const panel = doc.querySelector(".control-panel");
    const language = doc.querySelector(".language-control");
    const actions = doc.querySelector(".actions");
    const status = doc.querySelector(".status-card");
    const focused = doc.activeElement;
    const restoreFocus = language.contains(focused) || actions.contains(focused);
    if (compact) doc.querySelector(".topbar").append(language);
    else panel.insertBefore(language, status);
    panel.insertBefore(actions, compact ? status : doc.getElementById("installButton"));
    if (restoreFocus) focused.focus({ preventScroll: true });
  }

  return { createFeedback, createTurnScheduler, placeResponsiveControls };
});
