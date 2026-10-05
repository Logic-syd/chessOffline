(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ChessI18n = api;
})(typeof globalThis === "object" ? globalThis : self, function () {
  "use strict";

  const MESSAGES = {
    zh: {
      "app.name": "高山棋局", "app.description": "无需网络即可游玩的国际象棋，电脑棋力约 1000 分。",
      "brand.home": "高山棋局首页", "connection.pending": "离线待检查", "board.label": "国际象棋棋盘",
      "computer.name": "高山向导", "computer.type": "电脑", "computer.thinking": "思考中",
      "player.avatar": "你", "player.name": "登山者", "player.white": "执白棋", "player.black": "执黑棋",
      "controls.label": "对局控制", "language.label": "语言", "status.eyebrow": "当前局面",
      "status.yourTurn": "轮到你走", "status.instructions": "点一下棋子，再点它要去的位置。",
      "side.title": "选择阵营", "side.applies": "新局生效", "side.white": "执白", "side.black": "执黑",
      "difficulty.title": "选择电脑棋力", "difficulty.easy": "轻松", "difficulty.standard": "标准", "difficulty.challenge": "挑战",
      "difficulty.level": "{label}档", "difficulty.detail.easy": "少算一层，走法更随和。",
      "difficulty.detail.standard": "保留当前电脑体验，约 1000 分是目标而非正式定级。",
      "difficulty.detail.challenge": "保持当前搜索深度，稳定选择评估最高的走法。",
      "moves.title": "走棋记录", "moves.round": "第 {count} 回合", "moves.empty": "第一步，从这里开始。",
      "moves.lastPlayer": "你的上一步：{from} → {to}", "moves.lastComputer": "电脑的上一步：{from} → {to}",
      "actions.new": "新对局", "actions.undo": "悔棋", "actions.flip": "旋转棋盘", "actions.close": "关闭", "actions.gotIt": "知道了",
      "install.label": "安装到手机", "install.subtitle": "装好后，无信号也能打开", "install.title": "带它一起上山",
      "install.instructions.ios": "点 Safari 底部的分享按钮，再选择“添加到主屏幕”。请先打开一次，之后没有网络也能继续下棋。",
      "install.instructions.other": "在浏览器菜单里选择“安装应用”或“添加到主屏幕”。请先打开一次，之后没有网络也能继续下棋。",
      "travel.label": "徒步设置", "power.title": "省电模式", "power.on": "已开启", "power.off": "已关闭",
      "power.detail.on": "静音、无震动、减少动效，走棋高亮保留。",
      "power.detail.off": "启用声音、震动和动效；切到后台仍会暂停待执行的电脑回合。",
      "offline.check": "检查离线资源", "offline.checking": "正在检查离线资源，请稍候。",
      "offline.unsupported": "此环境不支持离线安装，请使用 HTTPS 或本机 localhost 打开。",
      "offline.registrationFailed": "离线安装未成功，请联网后重新打开；当前不能保证离线使用。",
      "offline.pending": "离线尚未准备完成，首次打开请保持联网。",
      "offline.checkingLocal": "正在检查本机离线资源…",
      "offline.cacheError": "无法读取离线缓存，请检查浏览器存储权限后重试。",
      "offline.versionPending": "离线版本尚未就绪，请联网完成更新后再检查。",
      "offline.incomplete": "离线资源不完整（缺少 {count} 项），请先保持联网使用，完成应用更新后再检查。",
      "offline.readyLimited": "离线准备完成；本次更新检查未完成。",
      "offline.ready": "离线准备完成，建议用飞行模式重新打开验证。",
      "offline.checkError": "离线检查未完成，请稍后重试；当前不能保证离线使用。",
      "offline.saveError": "新版本已就绪，但保存棋局失败；请先保留当前页面。",
      "connection.offlineReady": "离线已就绪", "connection.ready": "离线准备完成",
      "connection.checking": "正在检查", "connection.unready": "离线未就绪",
      "connection.offlineAppend": " 当前没有网络，可继续对弈。",
      "footer.saved": "每一步都会保存在这台设备上", "footer.engine": "离线引擎", "footer.lowPower": "低耗电", "footer.attribution": "棋子署名",
      "promotion.title": "兵升变为", "promotion.q": "后", "promotion.r": "车", "promotion.b": "象", "promotion.n": "马",
      "board.squarePiece": "{square} {color}{piece}", "board.squareEmpty": "{square} 空格",
      "board.lastFrom": "，上一步起点", "board.lastTo": "，上一步落点",
      "color.w": "白", "color.b": "黑", "piece.k": "王", "piece.q": "后", "piece.r": "车", "piece.b": "象", "piece.n": "马", "piece.p": "兵",
      "status.win": "你赢了", "status.loss": "将死，对局结束", "status.winDetail": "漂亮的一局。高山向导认输。",
      "status.lossDetail": "再来一局，换条路线试试。", "status.draw": "和棋", "status.gameOver": "对局结束",
      "status.thinkingTitle": "向导正在思考", "status.thinkingDetail": "所有计算都在这台设备上完成。",
      "status.opponentTurn": "对方回合", "status.checkTitle": "你的王被将军", "status.checkDetail": "必须先解除将军。",
      "status.yourIndicator": "轮到你", "status.guideTurn": "轮到向导", "status.guideDetail": "电脑即将在本机完成计算。",
      "draw.stalemate": "无子可走，形成逼和。", "draw.fifty": "五十回合没有吃子或走兵。",
      "draw.repetition": "同一局面出现了三次。", "draw.material": "剩余子力不足以将死。",
      "result.close": "关闭结果，查看棋盘", "result.scoreLabel": "对局比分", "result.new": "再来一局", "result.viewBoard": "看看最后的棋局",
      "result.eyebrow.win": "漂亮的将死", "result.eyebrow.loss": "这一局，向导胜出", "result.eyebrow.draw": "势均力敌",
      "result.title.win": "你赢了！", "result.title.loss": "再来一局？", "result.title.draw": "握手言和",
      "result.description.win": "这一局的风景，属于你。", "result.description.loss": "你的王被将死了。看看最后的棋局，下次再挑战。",
      "result.score.win": "你  1 : 0  向导", "result.score.loss": "你  0 : 1  向导", "result.score.draw": "你  ½ : ½  向导",
      "toast.newWhite": "新对局：你执白棋", "toast.newBlack": "新对局：你执黑棋", "toast.undo": "已回到你上一步之前",
      "toast.sideWhite": "已选择执白，点“新对局”开始", "toast.sideBlack": "已选择执黑，点“新对局”开始",
      "toast.difficultySaved": "电脑棋力已设为{label}，下次电脑走棋生效",
      "toast.difficultyUnsaved": "棋力本次生效，但设置暂时无法保存。", "toast.settingsUnsaved": "设置暂时无法保存，本次使用仍生效。",
      "webMcp.readTitle": "读取当前棋局", "webMcp.readDescription": "读取当前棋局的轮次、最近一步、对局状态和合法走法，不改变棋局。",
      "webMcp.newTitle": "开始新棋局", "webMcp.newDescription": "清空当前进度并开始一盘新的离线人机对局。",
      "webMcp.invalidColor": "playerColor 必须是 white 或 black",
    },
    en: {
      "app.name": "Mountain Chess", "app.description": "Play chess offline against a computer opponent. Around 1000 Elo as a casual target.",
      "brand.home": "Mountain Chess home", "connection.pending": "Offline check pending", "board.label": "Chessboard",
      "computer.name": "Mountain Guide", "computer.type": "Computer", "computer.thinking": "Thinking",
      "player.avatar": "You", "player.name": "Hiker", "player.white": "Playing White", "player.black": "Playing Black",
      "controls.label": "Game controls", "language.label": "Language", "status.eyebrow": "Current position",
      "status.yourTurn": "Your move", "status.instructions": "Tap a piece, then tap its destination.",
      "side.title": "Choose a side", "side.applies": "Next game", "side.white": "Play White", "side.black": "Play Black",
      "difficulty.title": "Computer strength", "difficulty.easy": "Easy", "difficulty.standard": "Standard", "difficulty.challenge": "Challenge",
      "difficulty.level": "{label} level", "difficulty.detail.easy": "Searches one move less and plays more casually.",
      "difficulty.detail.standard": "The original casual level. Around 1000 Elo is a target, not a measured rating.",
      "difficulty.detail.challenge": "Uses the same search depth and picks the highest-rated move.",
      "moves.title": "Move history", "moves.round": "Move {count}", "moves.empty": "Your first move starts here.",
      "moves.lastPlayer": "Your last move: {from} → {to}", "moves.lastComputer": "Computer's last move: {from} → {to}",
      "actions.new": "New game", "actions.undo": "Undo move", "actions.flip": "Flip board", "actions.close": "Close", "actions.gotIt": "Got it",
      "install.label": "Install on phone", "install.subtitle": "Play without a signal after setup", "install.title": "Take chess on your hike",
      "install.instructions.ios": "In Safari, tap Share, then Add to Home Screen. Open it once while online so it works without a connection later.",
      "install.instructions.other": "In your browser menu, choose Install app or Add to Home Screen. Open it once while online so it works without a connection later.",
      "travel.label": "Hiking settings", "power.title": "Power saving", "power.on": "On", "power.off": "Off",
      "power.detail.on": "No sound or vibration, fewer animations; move highlights stay visible.",
      "power.detail.off": "Sound, vibration and animations enabled. Computer turns still pause in the background.",
      "offline.check": "Check offline files", "offline.checking": "Checking offline files. Please wait.",
      "offline.unsupported": "Offline installation is unavailable here. Open the app over HTTPS or localhost.",
      "offline.registrationFailed": "Offline setup failed. Reopen while online; offline play is not yet assured.",
      "offline.pending": "Offline setup is not complete. Stay online for the first visit.",
      "offline.checkingLocal": "Checking files stored on this device…",
      "offline.cacheError": "Cannot read the offline cache. Check browser storage permissions and try again.",
      "offline.versionPending": "This offline version is not ready. Finish updating while online, then check again.",
      "offline.incomplete": "Offline files are incomplete ({count} missing). Stay online until the update finishes, then check again.",
      "offline.readyLimited": "Offline setup is complete, but this update check did not finish.",
      "offline.ready": "Offline setup is complete. Reopen in airplane mode to verify.",
      "offline.checkError": "Offline check did not finish. Try again later; offline play is not yet assured.",
      "offline.saveError": "A new version is ready, but saving the game failed. Keep this page open.",
      "connection.offlineReady": "Ready offline", "connection.ready": "Offline ready",
      "connection.checking": "Checking", "connection.unready": "Offline not ready",
      "connection.offlineAppend": " No network is available; you can keep playing.",
      "footer.saved": "Every move is saved on this device", "footer.engine": "Offline engine", "footer.lowPower": "Low power", "footer.attribution": "Piece credits",
      "promotion.title": "Promote pawn to", "promotion.q": "Queen", "promotion.r": "Rook", "promotion.b": "Bishop", "promotion.n": "Knight",
      "board.squarePiece": "{square}, {color} {piece}", "board.squareEmpty": "{square}, empty square",
      "board.lastFrom": ", start of last move", "board.lastTo": ", end of last move",
      "color.w": "white", "color.b": "black", "piece.k": "king", "piece.q": "queen", "piece.r": "rook", "piece.b": "bishop", "piece.n": "knight", "piece.p": "pawn",
      "status.win": "You won", "status.loss": "Checkmate. Game over.", "status.winDetail": "A fine game. The Mountain Guide is beaten.",
      "status.lossDetail": "Try another route in a new game.", "status.draw": "Draw", "status.gameOver": "Game over",
      "status.thinkingTitle": "The guide is thinking", "status.thinkingDetail": "All calculations happen on this device.",
      "status.opponentTurn": "Opponent's turn", "status.checkTitle": "Your king is in check", "status.checkDetail": "You must get out of check.",
      "status.yourIndicator": "Your turn", "status.guideTurn": "Guide's turn", "status.guideDetail": "The computer will calculate its move on this device.",
      "draw.stalemate": "No legal move: stalemate.", "draw.fifty": "Fifty moves without a capture or pawn move.",
      "draw.repetition": "The same position occurred three times.", "draw.material": "Not enough material for checkmate.",
      "result.close": "Close result and view board", "result.scoreLabel": "Game score", "result.new": "Play again", "result.viewBoard": "View final position",
      "result.eyebrow.win": "Checkmate!", "result.eyebrow.loss": "The guide wins", "result.eyebrow.draw": "Evenly matched",
      "result.title.win": "You won!", "result.title.loss": "Play again?", "result.title.draw": "A draw",
      "result.description.win": "The view from this game is yours.", "result.description.loss": "Your king was checkmated. Review the final position and try again.",
      "result.score.win": "You  1 : 0  Guide", "result.score.loss": "You  0 : 1  Guide", "result.score.draw": "You  ½ : ½  Guide",
      "toast.newWhite": "New game: you play White", "toast.newBlack": "New game: you play Black", "toast.undo": "Back before your last move",
      "toast.sideWhite": "White selected. Tap New game to start.", "toast.sideBlack": "Black selected. Tap New game to start.",
      "toast.difficultySaved": "Computer set to {label}. Applies on its next move.",
      "toast.difficultyUnsaved": "Strength changed for this session, but the setting could not be saved.",
      "toast.settingsUnsaved": "Could not save this setting. It still applies for this session.",
      "webMcp.readTitle": "Read current game", "webMcp.readDescription": "Read the turn, last move, outcome and legal moves without changing the game.",
      "webMcp.newTitle": "Start a new game", "webMcp.newDescription": "Clear progress and start a new offline game against the computer.",
      "webMcp.invalidColor": "playerColor must be white or black",
    },
  };

  function preferredLocale(saved, languages = []) {
    if (Object.prototype.hasOwnProperty.call(MESSAGES, saved)) return saved;
    for (const language of languages) {
      const code = String(language).toLowerCase().split("-")[0];
      if (Object.prototype.hasOwnProperty.call(MESSAGES, code)) return code;
    }
    return "en";
  }

  function createI18n(saved, languages) {
    let locale = preferredLocale(saved, languages);
    function t(key, params = {}) {
      const template = MESSAGES[locale][key] ?? MESSAGES.zh[key];
      if (template === undefined) throw new Error(`Missing translation: ${key}`);
      return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
    }
    function apply(doc) {
      doc.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
      doc.title = t("app.name");
      doc.querySelector('meta[name="description"]')?.setAttribute("content", t("app.description"));
      doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", t("app.name"));
      doc.querySelector('link[rel="manifest"]')?.setAttribute("href", locale === "zh" ? "./manifest.webmanifest" : `./manifest.${locale}.webmanifest`);
      doc.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
      doc.querySelectorAll("[data-i18n-aria]").forEach(node => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
      doc.querySelectorAll("[data-i18n-title]").forEach(node => { node.title = t(node.dataset.i18nTitle); });
      const select = doc.getElementById("languageSelect");
      if (select) select.value = locale;
    }
    function offlineMessage(status) {
      return status?.code && MESSAGES[locale][`offline.${status.code}`]
        ? t(`offline.${status.code}`, { count: status.count })
        : status?.message || t("offline.checking");
    }
    return {
      get locale() { return locale; },
      setLocale(value) { if (!Object.prototype.hasOwnProperty.call(MESSAGES, value)) return false; locale = value; return true; },
      t, apply, offlineMessage,
      formatMoveNotation(move) { return move; },
    };
  }

  return { MESSAGES, preferredLocale, createI18n };
});
