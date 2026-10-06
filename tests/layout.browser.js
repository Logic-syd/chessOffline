/* Browser-only regression test; not shipped in dist and needs no dependencies. */
(function () {
  "use strict";
  const runButton = document.getElementById("run");
  const output = document.getElementById("results");
  const frame = document.getElementById("preview");
  const widths = [320, 375, 390, 430, 580, 768, 900, 901, 1024, 1280];
  const states = [
    ["initial", "yourTurn", "instructions", "yourIndicator", null],
    ["player-moved", "guideTurn", "guideDetail", "opponentTurn", "lastPlayer"],
    ["thinking", "thinkingTitle", "thinkingDetail", "opponentTurn", "lastPlayer"],
    ["reply", "yourTurn", "instructions", "yourIndicator", "lastComputer"],
    ["check", "checkTitle", "checkDetail", "yourIndicator", "lastComputer"],
    ["win", "win", "winDetail", "gameOver", "lastPlayer"],
    ["loss", "loss", "lossDetail", "gameOver", "lastComputer"],
    ...["stalemate", "fifty", "repetition", "material"].map(reason =>
      [`draw-${reason}`, "draw", `draw.${reason}`, "gameOver", "lastComputer"]),
  ];
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  function measure(doc) {
    const rect = selector => doc.querySelector(selector).getBoundingClientRect();
    return {
      boardTop: rect(".board-frame").top,
      boardLeft: rect(".board-frame").left,
      boardWidth: rect(".board-frame").width,
      opponentHeight: rect(".opponent-row").height,
      playerHeight: rect(".player-row:not(.opponent-row)").height,
      statusHeight: rect(".status-card").height,
      historyTop: rect(".moves-list").top,
      actionsTop: rect(".actions").top,
    };
  }

  async function run() {
    runButton.disabled = true;
    output.textContent = "Running…";
    const failures = [], checks = [], installChecks = [], controlChecks = [];
    try {
      const response = await fetch("../dist/index.html", { cache: "no-store" });
      if (!response.ok) throw new Error(`App markup: HTTP ${response.status}`);
      const markup = (await response.text())
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<html\b/, '<html translate="no"')
        .replace("<head>", `<head><base href="${new URL("../dist/", location.href).href}">`);
      const loaded = new Promise(resolve => frame.addEventListener("load", resolve, { once: true }));
      frame.srcdoc = markup;
      await loaded;
      const doc = frame.contentDocument;
      doc.body.classList.add("power-saving");
      for (const locale of ["zh", "en", "de"]) {
        const i18n = ChessI18n.createI18n(locale, []);
        i18n.apply(doc);
        doc.getElementById("opponentDifficulty").textContent = i18n.t("difficulty.level", { label: i18n.t("difficulty.standard") });
        doc.getElementById("playerSideLabel").textContent = i18n.t("player.white");
        doc.getElementById("difficultyLabel").textContent = i18n.t("difficulty.standard");
        doc.getElementById("difficultyDetail").textContent = i18n.t("difficulty.detail.standard");
        doc.getElementById("moveCount").textContent = i18n.t("moves.round", { count: 2 });
        doc.getElementById("offlineDetail").textContent = i18n.t("offline.ready");
        doc.getElementById("powerSaveState").textContent = i18n.t("power.on");
        doc.getElementById("powerSaveDetail").textContent = i18n.t("power.detail.on");
        for (const width of widths) {
          frame.width = String(width);
          ChessRuntime.placeResponsiveControls(doc, width <= 900);
          let initial;
          for (const [name, title, detail, indicator, lastMove] of states) {
            doc.getElementById("statusTitle").textContent = i18n.t(`status.${title}`);
            doc.getElementById("statusDetail").textContent = i18n.t(detail.startsWith("draw.") ? detail : `status.${detail}`);
            doc.getElementById("turnIndicator").textContent = i18n.t(`status.${indicator}`);
            doc.getElementById("thinkingBadge").hidden = name !== "thinking";
            const summary = doc.getElementById("lastMoveSummary");
            summary.hidden = !lastMove;
            summary.textContent = lastMove ? i18n.t(`moves.${lastMove}`, { from: "e7", to: "e5" }) : "";
            await settle();
            const metrics = measure(doc);
            initial ??= metrics;
            const moved = Object.keys(metrics).filter(key => Math.abs(metrics[key] - initial[key]) > 0.5);
            const overflow = doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
            const result = { locale, width, state: name, metrics };
            checks.push(result);
            if (moved.length || overflow) failures.push({ ...result,
              differences: Object.fromEntries(moved.map(key => [key, +(metrics[key] - initial[key]).toFixed(2)])),
              overflow,
            });
          }
          const rect = selector => doc.querySelector(selector).getBoundingClientRect();
          const compact = width <= 900;
          const language = doc.querySelector(".language-control");
          const actions = doc.querySelector(".actions");
          const placed = compact
            ? language.parentElement === doc.querySelector(".topbar")
              && actions.nextElementSibling === doc.querySelector(".status-card")
              && rect(".language-control").top < rect(".play-area").top
              && Math.abs(rect(".language-control").right - rect(".topbar").right) < 1
              && rect(".actions").top >= rect(".play-area").bottom
              && rect(".actions").bottom <= rect(".status-card").top
              && rect(".status-card").height < 120
            : language.parentElement === doc.querySelector(".control-panel")
              && actions.previousElementSibling === doc.querySelector(".moves-section");
          const unique = ["languageSelect", "newGameButton", "undoButton", "flipButton"]
            .every(id => doc.querySelectorAll(`#${id}`).length === 1);
          const reachable = [...actions.querySelectorAll("button")].every(button => {
            const bounds = button.getBoundingClientRect();
            return bounds.width >= 44 && bounds.height >= 44;
          });
          const controlResult = { locale, width, state: "responsive-controls", placed, unique, reachable };
          controlChecks.push(controlResult);
          if (!placed || !unique || !reachable) failures.push(controlResult);
        }
      }
      // Check the real translated dialog without invoking a browser installation.
      const dialog = doc.getElementById("installDialog");
      for (const locale of ["zh", "en", "de"]) {
        const i18n = ChessI18n.createI18n(locale, []);
        i18n.apply(doc);
        for (const [width, height] of [[320, 568], [390, 844], [1280, 900]]) {
          frame.width = String(width);
          frame.height = String(height);
          ChessRuntime.placeResponsiveControls(doc, width <= 900);
          dialog.showModal();
          await settle();
          const bounds = dialog.getBoundingClientRect();
          const close = dialog.querySelector(".dialog-close").getBoundingClientRect();
          const correctText = doc.getElementById("installInstructions").textContent === i18n.t("install.instructions");
          const fits = bounds.left >= 0 && bounds.right <= width && bounds.top >= 0 && bounds.bottom <= height
            && dialog.scrollWidth <= dialog.clientWidth && close.top >= 0 && close.bottom <= height;
          const result = { locale, width, height, state: "install-dialog", correctText, fits };
          installChecks.push(result);
          if (!correctText || !fits) failures.push(result);
          dialog.close();
        }
      }
      // DOM output is intentionally readable by a human or browser automation.
      output.textContent = JSON.stringify({ passed: !failures.length, checked: checks.length,
        installChecked: installChecks.length, controlsChecked: controlChecks.length,
        failing: failures.length, failures }, null, 2);
    } catch (error) {
      output.textContent = `ERROR: ${error.message}`;
    } finally {
      runButton.disabled = false;
    }
  }
  runButton.addEventListener("click", run);
})();
