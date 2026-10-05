(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ChessOffline = api;
})(typeof globalThis === "object" ? globalThis : self, function () {
  "use strict";
  const APP_SHELL = [
    "./", "./index.html", "./styles.css", "./app.js", "./offline.js", "./runtime.js", "./i18n.js",
    "./manifest.webmanifest", "./manifest.en.webmanifest", "./manifest.de.webmanifest", "./icon.svg", "./pieces/NOTICE.txt", "./pieces/COPYING.txt",
    ...["w", "b"].flatMap(color => ["K", "Q", "R", "B", "N", "P"].map(piece => `./pieces/${color}${piece}.svg`)),
  ];

  function scopePrefix(scope) {
    return `kilimanjaro-chess-${encodeURIComponent(scope)}-`;
  }

  async function inspectCache(storage, name, scope) {
    // CacheStorage.match could accidentally find files in another version's cache.
    if (!(await storage.keys()).includes(name)) return APP_SHELL.slice();
    const cache = await storage.open(name);
    const matches = await Promise.all(APP_SHELL.map(path => cache.match(new URL(path, scope).href)));
    return APP_SHELL.filter((_, index) => !matches[index] || !matches[index].ok);
  }

  function start({ version, onStatus, beforeReload }, env = globalThis) {
    const sw = env.navigator && env.navigator.serviceWorker;
    const scope = new URL("./", env.location.href).href;
    const scriptURL = new URL("sw.js", scope).href;
    let sequence = 0, registrationError = false, reloading = false;
    const initialController = sw && sw.controller;
    const owns = controller => controller && controller.scriptURL === scriptURL;
    const emit = (state, message, extra = {}) => {
      const status = { state, message, ...extra };
      if (onStatus) onStatus(status);
      return status;
    };
    const timed = (promise, ms) => new Promise((resolve, reject) => {
      const timer = env.setTimeout(() => reject(new Error("timeout")), ms);
      promise.then(value => { env.clearTimeout(timer); resolve(value); }, error => { env.clearTimeout(timer); reject(error); });
    });

    async function check() {
      const current = ++sequence;
      if (!sw || !env.MessageChannel || env.isSecureContext === false) {
        return emit("unsupported", "此环境不支持离线安装，请使用 HTTPS 或本机 localhost 打开。", { code: "unsupported" });
      }
      if (!owns(sw.controller)) {
        return emit(registrationError ? "error" : "missing", registrationError
          ? "离线安装未成功，请联网后重新打开；当前不能保证离线使用。"
          : "离线尚未准备完成，首次打开请保持联网。", { code: registrationError ? "registrationFailed" : "pending" });
      }
      emit("checking", "正在检查本机离线资源…", { code: "checkingLocal" });
      const controller = sw.controller;
      const channel = new env.MessageChannel();
      try {
        const info = await timed(new Promise((resolve, reject) => {
          channel.port1.onmessage = event => resolve(event.data);
          channel.port1.onmessageerror = reject;
          controller.postMessage({ type: "CHESS_OFFLINE_CHECK" }, [channel.port2]);
        }), 4000);
        if (current !== sequence) return;
        if (sw.controller !== controller) return check();
        if (!info || info.error) return emit("error", "无法读取离线缓存，请检查浏览器存储权限后重试。", { code: "cacheError" });
        if (info.scope !== scope || info.version !== version || !Array.isArray(info.missing)) {
          return emit("missing", "离线版本尚未就绪，请联网完成更新后再检查。", { code: "versionPending" });
        }
        if (info.missing.length) return emit("missing", `离线资源不完整（缺少 ${info.missing.length} 项），请先保持联网使用，完成应用更新后再检查。`, { missing: info.missing, count: info.missing.length, code: "incomplete" });
        return emit("ready", registrationError ? "离线准备完成；本次更新检查未完成。" : "离线准备完成，建议用飞行模式重新打开验证。", { code: registrationError ? "readyLimited" : "ready" });
      } catch (_) {
        if (current === sequence) return emit("error", "离线检查未完成，请稍后重试；当前不能保证离线使用。", { code: "checkError" });
      } finally {
        channel.port1.close();
        channel.port2.close();
      }
    }

    if (!sw || !env.MessageChannel || env.isSecureContext === false) {
      check();
      return { check };
    }
    sw.addEventListener("controllerchange", () => {
      if (!reloading && owns(initialController) && owns(sw.controller) && sw.controller !== initialController) {
        reloading = true;
        Promise.resolve().then(() => beforeReload && beforeReload()).then(() => env.location.reload()).catch(() => {
          emit("error", "新版本已就绪，但保存棋局失败；请先保留当前页面。", { code: "saveError" });
        });
      } else if (!reloading) check();
    });
    function watch(worker) {
      if (worker) worker.addEventListener("statechange", () => {
        if (["activated", "redundant"].includes(worker.state)) check();
      });
    }
    check();
    // register already performs the browser's update check; no polling or extra probes.
    timed(Promise.resolve().then(() => sw.register(scriptURL, { scope, updateViaCache: "none" })), 8000).then(registration => {
      watch(registration.installing);
      registration.addEventListener("updatefound", () => watch(registration.installing));
      check();
    }).catch(() => {
      registrationError = true;
      check();
    });
    return { check };
  }

  return { APP_SHELL, scopePrefix, inspectCache, start };
});
