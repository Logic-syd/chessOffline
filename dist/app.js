(() => {
  "use strict";

  const FILES = "abcdefgh";
  const STORAGE_KEY = "kilimanjaro-chess-v1";
  const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const KNIGHT_STEPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

  function pieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? "w" : "b";
  }

  function opponent(color) { return color === "w" ? "b" : "w"; }
  function pieceImage(piece) {
    const image = document.createElement("img");
    image.src = `./pieces/${pieceColor(piece)}${piece.toUpperCase()}.svg`;
    image.className = `piece ${pieceColor(piece) === "w" ? "white" : "black"}`;
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    return image;
  }
  function rowOf(square) { return Math.floor(square / 8); }
  function colOf(square) { return square % 8; }
  function inside(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
  function algebraic(square) { return FILES[colOf(square)] + (8 - rowOf(square)); }
  function squareIndex(name) {
    if (!/^[a-h][1-8]$/.test(name)) return -1;
    return (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);
  }

  function createGame(playerColor = "w") {
    const board = [
      ..."rnbqkbnr", ..."pppppppp", ..."........", ..."........",
      ..."........", ..."........", ..."PPPPPPPP", ..."RNBQKBNR",
    ].map(piece => piece === "." ? null : piece);
    const game = {
      board, turn: "w", castling: "KQkq", ep: null,
      halfmove: 0, fullmove: 1, playerColor,
      moveLog: [], positions: [], lastMove: null,
    };
    game.positions.push(positionKey(game));
    return game;
  }

  function cloneGame(game) {
    return {
      ...game,
      board: [...game.board],
      moveLog: [...game.moveLog],
      positions: [...game.positions],
      lastMove: game.lastMove ? { ...game.lastMove } : null,
    };
  }

  function positionKey(game) {
    return `${game.board.map(piece => piece || ".").join("")}|${game.turn}|${game.castling || "-"}|${game.ep ?? "-"}`;
  }

  function isSquareAttacked(board, target, byColor) {
    const tr = rowOf(target);
    const tc = colOf(target);

    for (let square = 0; square < 64; square += 1) {
      const piece = board[square];
      if (!piece || pieceColor(piece) !== byColor) continue;
      const type = piece.toLowerCase();
      const row = rowOf(square);
      const col = colOf(square);

      if (type === "p") {
        const dir = byColor === "w" ? -1 : 1;
        if (row + dir === tr && Math.abs(col - tc) === 1) return true;
      } else if (type === "n") {
        if (KNIGHT_STEPS.some(([dr, dc]) => row + dr === tr && col + dc === tc)) return true;
      } else if (type === "k") {
        if (Math.max(Math.abs(row - tr), Math.abs(col - tc)) === 1) return true;
      } else {
        const directions = type === "b" ? BISHOP_DIRS : type === "r" ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
        for (const [dr, dc] of directions) {
          let nr = row + dr;
          let nc = col + dc;
          while (inside(nr, nc)) {
            const next = nr * 8 + nc;
            if (next === target) return true;
            if (board[next]) break;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
    return false;
  }

  function inCheck(game, color) {
    const king = color === "w" ? "K" : "k";
    const square = game.board.indexOf(king);
    return square >= 0 && isSquareAttacked(game.board, square, opponent(color));
  }

  function pushMove(moves, from, to, extras = {}) {
    moves.push({ from, to, ...extras });
  }

  function pseudoMoves(game, color) {
    const moves = [];
    for (let from = 0; from < 64; from += 1) {
      const piece = game.board[from];
      if (!piece || pieceColor(piece) !== color) continue;
      const type = piece.toLowerCase();
      const row = rowOf(from);
      const col = colOf(from);

      if (type === "p") {
        const dir = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        const promotionRow = color === "w" ? 0 : 7;
        const oneRow = row + dir;
        if (inside(oneRow, col)) {
          const one = oneRow * 8 + col;
          if (!game.board[one]) {
            if (oneRow === promotionRow) {
              for (const promotion of ["q", "r", "b", "n"]) pushMove(moves, from, one, { promotion });
            } else {
              pushMove(moves, from, one);
              const twoRow = row + dir * 2;
              const two = twoRow * 8 + col;
              if (row === startRow && !game.board[two]) pushMove(moves, from, two, { doublePawn: true });
            }
          }
        }
        for (const dc of [-1, 1]) {
          const nr = row + dir;
          const nc = col + dc;
          if (!inside(nr, nc)) continue;
          const to = nr * 8 + nc;
          const target = game.board[to];
          if ((target && pieceColor(target) !== color) || to === game.ep) {
            const extras = to === game.ep && !target ? { enPassant: true } : {};
            if (nr === promotionRow) {
              for (const promotion of ["q", "r", "b", "n"]) pushMove(moves, from, to, { ...extras, promotion });
            } else {
              pushMove(moves, from, to, extras);
            }
          }
        }
      } else if (type === "n" || type === "k") {
        const steps = type === "n" ? KNIGHT_STEPS : KING_STEPS;
        for (const [dr, dc] of steps) {
          const nr = row + dr;
          const nc = col + dc;
          if (!inside(nr, nc)) continue;
          const to = nr * 8 + nc;
          if (pieceColor(game.board[to]) !== color) pushMove(moves, from, to);
        }

        if (type === "k") {
          const enemy = opponent(color);
          if (color === "w" && from === 60 && !inCheck(game, color)) {
            if (game.castling.includes("K") && game.board[63] === "R" && !game.board[61] && !game.board[62] && !isSquareAttacked(game.board, 61, enemy) && !isSquareAttacked(game.board, 62, enemy)) pushMove(moves, 60, 62, { castle: "K" });
            if (game.castling.includes("Q") && game.board[56] === "R" && !game.board[57] && !game.board[58] && !game.board[59] && !isSquareAttacked(game.board, 59, enemy) && !isSquareAttacked(game.board, 58, enemy)) pushMove(moves, 60, 58, { castle: "Q" });
          }
          if (color === "b" && from === 4 && !inCheck(game, color)) {
            if (game.castling.includes("k") && game.board[7] === "r" && !game.board[5] && !game.board[6] && !isSquareAttacked(game.board, 5, enemy) && !isSquareAttacked(game.board, 6, enemy)) pushMove(moves, 4, 6, { castle: "K" });
            if (game.castling.includes("q") && game.board[0] === "r" && !game.board[1] && !game.board[2] && !game.board[3] && !isSquareAttacked(game.board, 3, enemy) && !isSquareAttacked(game.board, 2, enemy)) pushMove(moves, 4, 2, { castle: "Q" });
          }
        }
      } else {
        const directions = type === "b" ? BISHOP_DIRS : type === "r" ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
        for (const [dr, dc] of directions) {
          let nr = row + dr;
          let nc = col + dc;
          while (inside(nr, nc)) {
            const to = nr * 8 + nc;
            const targetColor = pieceColor(game.board[to]);
            if (targetColor === color) break;
            pushMove(moves, from, to);
            if (targetColor && targetColor !== color) break;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
    return moves;
  }

  function applyCore(game, move, withNotation = true) {
    // Search and legality checks only change the board; their histories stay read-only.
    // Real moves still own separate history arrays before appending notation/positions.
    const next = withNotation ? cloneGame(game) : { ...game, board: [...game.board] };
    const piece = next.board[move.from];
    const color = pieceColor(piece);
    const captured = move.enPassant ? next.board[move.to + (color === "w" ? 8 : -8)] : next.board[move.to];

    next.board[move.from] = null;
    next.board[move.to] = move.promotion ? (color === "w" ? move.promotion.toUpperCase() : move.promotion) : piece;

    if (move.enPassant) next.board[move.to + (color === "w" ? 8 : -8)] = null;
    if (move.castle === "K") {
      const rookFrom = color === "w" ? 63 : 7;
      const rookTo = color === "w" ? 61 : 5;
      next.board[rookTo] = next.board[rookFrom];
      next.board[rookFrom] = null;
    }
    if (move.castle === "Q") {
      const rookFrom = color === "w" ? 56 : 0;
      const rookTo = color === "w" ? 59 : 3;
      next.board[rookTo] = next.board[rookFrom];
      next.board[rookFrom] = null;
    }

    let rights = next.castling;
    if (piece === "K") rights = rights.replace(/[KQ]/g, "");
    if (piece === "k") rights = rights.replace(/[kq]/g, "");
    if (move.from === 63 || move.to === 63) rights = rights.replace("K", "");
    if (move.from === 56 || move.to === 56) rights = rights.replace("Q", "");
    if (move.from === 7 || move.to === 7) rights = rights.replace("k", "");
    if (move.from === 0 || move.to === 0) rights = rights.replace("q", "");
    next.castling = rights;

    next.ep = move.doublePawn ? (move.from + move.to) / 2 : null;
    next.halfmove = piece.toLowerCase() === "p" || captured ? 0 : next.halfmove + 1;
    if (color === "b") next.fullmove += 1;
    next.turn = opponent(color);
    next.lastMove = { from: move.from, to: move.to };

    if (withNotation) {
      next.positions.push(positionKey(next));
      next.moveLog.push(moveNotation(game, next, move, piece, Boolean(captured)));
    }
    return next;
  }

  function legalMoves(game, color = game.turn) {
    return pseudoMoves(game, color).filter(move => !inCheck(applyCore(game, move, false), color));
  }

  function hasLegalMove(game, color = game.turn) {
    return pseudoMoves(game, color).some(move => !inCheck(applyCore(game, move, false), color));
  }

  function moveNotation(before, after, move, piece, captured) {
    if (move.castle === "K") return inCheck(after, after.turn) ? "O-O+" : "O-O";
    if (move.castle === "Q") return inCheck(after, after.turn) ? "O-O-O+" : "O-O-O";
    const type = piece.toUpperCase();
    const prefix = type === "P" ? (captured ? FILES[colOf(move.from)] : "") : type;
    const capture = captured ? "×" : "";
    const promotion = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
    const responses = legalMoves(after);
    const suffix = inCheck(after, after.turn) ? (responses.length ? "+" : "#") : "";
    return `${prefix}${capture}${algebraic(move.to)}${promotion}${suffix}`;
  }

  function insufficientMaterial(game) {
    const pieces = game.board.filter(Boolean).filter(piece => piece.toLowerCase() !== "k");
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && ["b", "n"].includes(pieces[0].toLowerCase())) return true;
    if (pieces.every(piece => piece.toLowerCase() === "b")) {
      const bishopSquares = game.board.map((piece, index) => piece && piece.toLowerCase() === "b" ? index : -1).filter(index => index >= 0);
      return bishopSquares.every(square => (rowOf(square) + colOf(square)) % 2 === (rowOf(bishopSquares[0]) + colOf(bishopSquares[0])) % 2);
    }
    return false;
  }

  function gameOutcome(game) {
    const moves = legalMoves(game);
    if (!moves.length) {
      if (inCheck(game, game.turn)) return { over: true, type: "checkmate", winner: opponent(game.turn) };
      return { over: true, type: "stalemate", winner: null };
    }
    if (game.halfmove >= 100) return { over: true, type: "fifty", winner: null };
    const key = positionKey(game);
    if (game.positions.filter(position => position === key).length >= 3) return { over: true, type: "repetition", winner: null };
    if (insufficientMaterial(game)) return { over: true, type: "material", winner: null };
    return { over: false, type: null, winner: null };
  }

  function centerBonus(square) {
    const row = rowOf(square);
    const col = colOf(square);
    return 7 - (Math.abs(3.5 - row) + Math.abs(3.5 - col));
  }

  function evaluate(game, rootColor) {
    const outcome = gameOutcomeFast(game);
    if (outcome) {
      if (!outcome.winner) return 0;
      return outcome.winner === rootColor ? 100000 : -100000;
    }
    let score = 0;
    for (let square = 0; square < 64; square += 1) {
      const piece = game.board[square];
      if (!piece) continue;
      const color = pieceColor(piece);
      const type = piece.toLowerCase();
      let value = VALUES[type];
      if (["n", "b", "p"].includes(type)) value += centerBonus(square) * (type === "p" ? 2 : 4);
      if (type === "p") {
        const advance = color === "w" ? 6 - rowOf(square) : rowOf(square) - 1;
        value += Math.max(0, advance) * 6;
      }
      score += color === rootColor ? value : -value;
    }
    return score;
  }

  function gameOutcomeFast(game) {
    if (hasLegalMove(game)) return null;
    return { winner: inCheck(game, game.turn) ? opponent(game.turn) : null };
  }

  function moveOrderScore(game, move) {
    const moving = game.board[move.from];
    const target = move.enPassant ? (moving === "P" ? "p" : "P") : game.board[move.to];
    return (target ? VALUES[target.toLowerCase()] * 10 - VALUES[moving.toLowerCase()] : 0) + (move.promotion ? VALUES[move.promotion] : 0) + (move.castle ? 40 : 0);
  }

  function search(game, depth, alpha, beta, rootColor) {
    if (depth <= 0) return evaluate(game, rootColor);
    const moves = legalMoves(game).sort((a, b) => moveOrderScore(game, b) - moveOrderScore(game, a));
    if (!moves.length) return evaluate(game, rootColor);

    if (game.turn === rootColor) {
      let best = -Infinity;
      for (const move of moves) {
        best = Math.max(best, search(applyCore(game, move, false), depth - 1, alpha, beta, rootColor));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      best = Math.min(best, search(applyCore(game, move, false), depth - 1, alpha, beta, rootColor));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function chooseComputerMove(game) {
    const rootColor = game.turn;
    const moves = legalMoves(game);
    if (!moves.length) return null;
    const depth = game.moveLog.length < 10 ? 2 : 2;
    const scored = moves.map(move => ({
      move,
      score: search(applyCore(game, move, false), depth - 1, -Infinity, Infinity, rootColor) + (Math.random() - 0.5) * 24,
    })).sort((a, b) => b.score - a.score);

    const shortlist = scored.slice(0, Math.min(4, scored.length));
    const roll = Math.random();
    const index = roll < 0.58 ? 0 : roll < 0.82 ? 1 : roll < 0.94 ? 2 : 3;
    return shortlist[Math.min(index, shortlist.length - 1)].move;
  }

  function playUci(game, uci) {
    const from = squareIndex(uci.slice(0, 2));
    const to = squareIndex(uci.slice(2, 4));
    const promotion = uci[4]?.toLowerCase();
    const move = legalMoves(game).find(candidate => candidate.from === from && candidate.to === to && (!candidate.promotion || candidate.promotion === (promotion || "q")));
    if (!move) throw new Error(`Illegal move: ${uci}`);
    return applyCore(game, move, true);
  }

  function initApp() {
    const elements = {
      board: document.getElementById("board"),
      statusTitle: document.getElementById("statusTitle"),
      statusDetail: document.getElementById("statusDetail"),
      thinkingBadge: document.getElementById("thinkingBadge"),
      turnIndicator: document.getElementById("turnIndicator"),
      playerSideLabel: document.getElementById("playerSideLabel"),
      movesList: document.getElementById("movesList"),
      moveCount: document.getElementById("moveCount"),
      lastMoveSummary: document.getElementById("lastMoveSummary"),
      resultDialog: document.getElementById("resultDialog"),
      resultCard: document.getElementById("resultCard"),
      resultEmblem: document.getElementById("resultEmblem"),
      resultEyebrow: document.getElementById("resultEyebrow"),
      resultTitle: document.getElementById("resultTitle"),
      resultDescription: document.getElementById("resultDescription"),
      resultScore: document.getElementById("resultScore"),
      resultConfetti: document.getElementById("resultConfetti"),
      undoButton: document.getElementById("undoButton"),
      newGameButton: document.getElementById("newGameButton"),
      flipButton: document.getElementById("flipButton"),
      installButton: document.getElementById("installButton"),
      installDialog: document.getElementById("installDialog"),
      installInstructions: document.getElementById("installInstructions"),
      promotionDialog: document.getElementById("promotionDialog"),
      promotionOptions: document.getElementById("promotionOptions"),
      connectionStatus: document.getElementById("connectionStatus"),
      offlineCheckButton: document.getElementById("offlineCheckButton"),
      offlineDetail: document.getElementById("offlineDetail"),
      powerSaveButton: document.getElementById("powerSaveButton"),
      powerSaveState: document.getElementById("powerSaveState"),
      powerSaveDetail: document.getElementById("powerSaveDetail"),
      toast: document.getElementById("toast"),
      sideButtons: [...document.querySelectorAll(".side-button")],
    };

    let game;
    let undoStack = [];
    let selected = null;
    let orientation = "w";
    let preferredSide = "w";
    let thinking = false;
    let computerScheduler;
    let installPrompt = null;
    let toastTimer = null;
    let resultTimer = null;
    let shownResultKey = null;
    let animateDestination = false;
    const SETTINGS_KEY = "kilimanjaro-chess-settings-v1";
    let powerSaving = true;
    try { powerSaving = JSON.parse(localStorage.getItem(SETTINGS_KEY))?.powerSaving !== false; } catch (_) { /* Default to hiking-friendly settings. */ }
    const sound = window.ChessRuntime.createFeedback({
      audioClass: window.AudioContext || window.webkitAudioContext,
      vibrate: pattern => navigator.vibrate?.(pattern),
    });
    let offlineManager;
    let offlineStatus = { state: "checking", message: "正在检查离线资源，请稍候。" };

    function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.game?.board?.length === 64) {
          game = saved.game;
          undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
          orientation = saved.orientation || game.playerColor;
          preferredSide = saved.preferredSide || game.playerColor;
          return;
        }
      } catch (_) { /* Start fresh if storage is unavailable or corrupt. */ }
      game = createGame("w");
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, undoStack: undoStack.slice(-30), orientation, preferredSide }));
      } catch (_) { /* The game remains playable when storage is full. */ }
    }

    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1800);
    }

    function feedback(capture = false) {
      if (!document.hidden) sound.play(capture);
    }

    function applyPowerSaving() {
      document.body.classList.toggle("power-saving", powerSaving);
      elements.powerSaveButton.setAttribute("aria-pressed", String(powerSaving));
      elements.powerSaveState.textContent = powerSaving ? "已开启" : "已关闭";
      elements.powerSaveDetail.textContent = powerSaving
        ? "静音、无震动、减少动效，走棋高亮保留。"
        : "启用声音、震动和动效；切到后台仍会暂停待执行的电脑回合。";
      sound.setEnabled(!powerSaving && !document.hidden);
    }

    function performMove(move, byComputer = false) {
      const capture = Boolean(game.board[move.to] || move.enPassant);
      undoStack.push(cloneGame(game));
      game = applyCore(game, move, true);
      selected = null;
      animateDestination = !powerSaving;
      save();
      feedback(capture);
      render();
      const outcome = gameOutcome(game);
      if (!outcome.over && game.turn !== game.playerColor && !byComputer) scheduleComputer();
    }

    function requestPromotion(moves) {
      elements.promotionOptions.replaceChildren();
      for (const move of moves) {
        const piece = game.playerColor === "w" ? move.promotion.toUpperCase() : move.promotion;
        const button = document.createElement("button");
        button.type = "button";
        button.append(pieceImage(piece));
        button.setAttribute("aria-label", { q: "后", r: "车", b: "象", n: "马" }[move.promotion]);
        button.addEventListener("click", () => {
          elements.promotionDialog.close();
          performMove(move);
        });
        elements.promotionOptions.append(button);
      }
      elements.promotionDialog.showModal();
    }

    function handleSquare(square) {
      if (thinking || game.turn !== game.playerColor || gameOutcome(game).over) return;
      const piece = game.board[square];
      const color = pieceColor(piece);
      if (selected !== null) {
        const candidates = legalMoves(game).filter(move => move.from === selected && move.to === square);
        if (candidates.length > 1) return requestPromotion(candidates);
        if (candidates.length === 1) return performMove(candidates[0]);
      }
      selected = color === game.playerColor ? square : null;
      renderBoard();
    }

    function renderBoard() {
      const currentMoves = legalMoves(game);
      const selectedMoves = selected === null ? [] : currentMoves.filter(move => move.from === selected);
      const checkedKing = inCheck(game, game.turn) ? game.board.indexOf(game.turn === "w" ? "K" : "k") : -1;
      const fragment = document.createDocumentFragment();

      for (let visual = 0; visual < 64; visual += 1) {
        const square = orientation === "w" ? visual : 63 - visual;
        const row = rowOf(square);
        const col = colOf(square);
        const visualRow = Math.floor(visual / 8);
        const visualCol = visual % 8;
        const piece = game.board[square];
        const button = document.createElement("button");
        button.type = "button";
        button.className = `square ${(row + col) % 2 ? "dark" : "light"}`;
        button.dataset.square = algebraic(square);
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", `${algebraic(square)}${piece ? ` ${pieceColor(piece) === "w" ? "白" : "黑"}${{k:"王",q:"后",r:"车",b:"象",n:"马",p:"兵"}[piece.toLowerCase()]}` : " 空格"}`);
        if (selected === square) button.classList.add("selected");
        if (game.lastMove?.from === square) {
          button.classList.add("last-from");
          button.setAttribute("aria-label", `${button.getAttribute("aria-label")}，上一步起点`);
        }
        if (game.lastMove?.to === square) {
          button.classList.add("last-to");
          if (animateDestination) button.classList.add("just-moved");
          button.setAttribute("aria-label", `${button.getAttribute("aria-label")}，上一步落点`);
        }
        if (checkedKing === square) button.classList.add("checked");

        const targetMove = selectedMoves.find(move => move.to === square);
        if (targetMove) {
          const marker = document.createElement("span");
          marker.className = game.board[square] || targetMove.enPassant ? "capture-ring" : "move-dot";
          button.append(marker);
        }
        if (piece) {
          button.append(pieceImage(piece));
        }
        if (visualRow === 7) {
          const file = document.createElement("span");
          file.className = "coord file";
          file.textContent = FILES[col];
          button.append(file);
        }
        if (visualCol === 0) {
          const rank = document.createElement("span");
          rank.className = "coord rank";
          rank.textContent = String(8 - row);
          button.append(rank);
        }
        button.addEventListener("click", () => handleSquare(square));
        fragment.append(button);
      }
      elements.board.replaceChildren(fragment);
      animateDestination = false;
    }

    function renderMoves() {
      if (!game.moveLog.length) {
        elements.movesList.className = "moves-list empty";
        elements.movesList.innerHTML = '<div class="empty-moves"><span aria-hidden="true">♙</span><p>第一步，从这里开始。</p></div>';
      } else {
        elements.movesList.className = "moves-list";
        const rows = [];
        for (let i = 0; i < game.moveLog.length; i += 2) {
          const last = game.moveLog.length - 1;
          rows.push(`<div class="move-row"><span class="number">${i / 2 + 1}.</span><span class="move${i === last ? " latest" : ""}"${i === last ? ' aria-current="step"' : ""}>${game.moveLog[i] || ""}</span><span class="move${i + 1 === last ? " latest" : ""}"${i + 1 === last ? ' aria-current="step"' : ""}>${game.moveLog[i + 1] || ""}</span></div>`);
        }
        elements.movesList.innerHTML = rows.join("");
        elements.movesList.scrollTop = elements.movesList.scrollHeight;
      }
      elements.moveCount.textContent = `第 ${Math.floor(game.moveLog.length / 2) + 1} 回合`;
      elements.lastMoveSummary.hidden = !game.lastMove;
      elements.lastMoveSummary.textContent = game.lastMove
        ? `${opponent(game.turn) === game.playerColor ? "你" : "电脑"}的上一步：${algebraic(game.lastMove.from)} → ${algebraic(game.lastMove.to)}`
        : "";
    }

    function renderStatus() {
      const outcome = gameOutcome(game);
      const playerWon = outcome.winner === game.playerColor;
      if (outcome.over) {
        if (outcome.type === "checkmate") {
          elements.statusTitle.textContent = playerWon ? "你赢了" : "将死，对局结束";
          elements.statusDetail.textContent = playerWon ? "漂亮的一局。高山向导认输。" : "再来一局，换条路线试试。";
        } else {
          elements.statusTitle.textContent = "和棋";
          elements.statusDetail.textContent = { stalemate: "无子可走，形成逼和。", fifty: "五十回合没有吃子或走兵。", repetition: "同一局面出现了三次。", material: "剩余子力不足以将死。" }[outcome.type];
        }
        elements.turnIndicator.textContent = "对局结束";
      } else if (thinking) {
        elements.statusTitle.textContent = "向导正在思考";
        elements.statusDetail.textContent = "所有计算都在这台设备上完成。";
        elements.turnIndicator.textContent = "对方回合";
      } else if (game.turn === game.playerColor) {
        elements.statusTitle.textContent = inCheck(game, game.turn) ? "你的王被将军" : "轮到你走";
        elements.statusDetail.textContent = inCheck(game, game.turn) ? "必须先解除将军。" : "点一下棋子，再点它要去的位置。";
        elements.turnIndicator.textContent = "轮到你";
      } else {
        elements.statusTitle.textContent = "轮到向导";
        elements.statusDetail.textContent = "电脑即将在本机完成计算。";
        elements.turnIndicator.textContent = "对方回合";
      }
      elements.thinkingBadge.hidden = !thinking;
    }

    function renderSide() {
      elements.playerSideLabel.textContent = game.playerColor === "w" ? "执白棋" : "执黑棋";
      for (const button of elements.sideButtons) {
        const active = button.dataset.side === preferredSide;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      }
    }

    function clearResult() {
      clearTimeout(resultTimer);
      resultTimer = null;
      shownResultKey = null;
      if (elements.resultDialog.open) elements.resultDialog.close();
      elements.resultConfetti.replaceChildren();
      elements.board.parentElement.removeAttribute("data-result");
    }

    function renderResult() {
      const outcome = gameOutcome(game);
      if (!outcome.over) return clearResult();
      const key = `${positionKey(game)}|${game.moveLog.length}|${outcome.type}`;
      if (shownResultKey === key) return;
      shownResultKey = key;
      const mood = !outcome.winner ? "draw" : outcome.winner === game.playerColor ? "win" : "loss";
      elements.board.parentElement.dataset.result = mood;
      elements.resultCard.dataset.result = mood;
      elements.resultEyebrow.textContent = { win: "漂亮的将死", loss: "这一局，向导胜出", draw: "势均力敌" }[mood];
      elements.resultTitle.textContent = { win: "你赢了！", loss: "再来一局？", draw: "握手言和" }[mood];
      elements.resultDescription.textContent = mood === "win"
        ? "这一局的风景，属于你。"
        : mood === "loss"
          ? "你的王被将死了。看看最后的棋局，下次再挑战。"
          : { stalemate: "无子可走，形成逼和。", fifty: "五十回合没有吃子或走兵。", repetition: "同一局面出现了三次。", material: "剩余子力不足以将死。" }[outcome.type];
      elements.resultScore.textContent = { win: "你  1 : 0  向导", loss: "你  0 : 1  向导", draw: "你  ½ : ½  向导" }[mood];
      elements.resultEmblem.replaceChildren();
      if (mood === "draw") {
        elements.resultEmblem.append(pieceImage("K"), pieceImage("k"));
      } else {
        elements.resultEmblem.append(pieceImage(game.playerColor === "w" ? "K" : "k"));
      }
      elements.resultConfetti.replaceChildren();
      if (mood === "win" && !powerSaving) {
        for (let i = 0; i < 26; i += 1) {
          const particle = document.createElement("i");
          particle.style.setProperty("--x", `${(i * 37) % 100}%`);
          particle.style.setProperty("--drift", `${((i * 23) % 120) - 60}px`);
          particle.style.setProperty("--delay", `${(i % 7) * 80}ms`);
          particle.style.setProperty("--spin", `${(i % 2 ? 1 : -1) * (160 + i * 17)}deg`);
          elements.resultConfetti.append(particle);
        }
      }
      // Leave a moment to see the final move before opening the result.
      resultTimer = setTimeout(() => {
        if (shownResultKey === key && !elements.resultDialog.open) elements.resultDialog.showModal();
      }, 650);
    }

    function render() {
      renderBoard();
      renderMoves();
      renderStatus();
      renderSide();
      elements.undoButton.disabled = undoStack.length === 0;
      renderResult();
    }

    function scheduleComputer() {
      computerScheduler.schedule();
    }

    function startNewGame(side = preferredSide) {
      clearResult();
      if (elements.promotionDialog.open) elements.promotionDialog.close();
      computerScheduler.cancel();
      thinking = false;
      game = createGame(side);
      preferredSide = side;
      orientation = side;
      undoStack = [];
      selected = null;
      save();
      render();
      showToast(side === "w" ? "新对局：你执白棋" : "新对局：你执黑棋");
      if (game.turn !== game.playerColor) scheduleComputer();
    }

    function undo() {
      if (!undoStack.length) return;
      clearResult();
      if (elements.promotionDialog.open) elements.promotionDialog.close();
      computerScheduler.cancel();
      thinking = false;
      do {
        game = undoStack.pop();
      } while (undoStack.length && game.turn !== game.playerColor);
      selected = null;
      save();
      render();
      showToast("已回到你上一步之前");
    }

    function updateConnection() {
      const offline = !navigator.onLine;
      const ready = offlineStatus.state === "ready";
      elements.connectionStatus.classList.toggle("offline", offline);
      elements.connectionStatus.classList.toggle("unready", !ready);
      elements.connectionStatus.querySelector("span:last-child").textContent = ready
        ? (offline ? "离线已就绪" : "离线准备完成")
        : (offlineStatus.state === "checking" ? "正在检查" : "离线未就绪");
      elements.offlineDetail.textContent = offlineStatus.message + (ready && offline ? " 当前没有网络，可继续对弈。" : "");
      elements.offlineCheckButton.disabled = offlineStatus.state === "checking";
    }

    function registerWebMcp() {
      const context = document.modelContext;
      if (!context?.registerTool) return;
      const safe = promise => Promise.resolve(promise).catch(() => {});
      try {
        safe(context.registerTool({
          name: "read_chess_position",
          title: "读取当前棋局",
          description: "读取当前棋局的轮次、最近一步、对局状态和合法走法，不改变棋局。",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute() {
            const outcome = gameOutcome(game);
            return { turn: game.turn, playerColor: game.playerColor, lastMove: game.lastMove ? `${algebraic(game.lastMove.from)}${algebraic(game.lastMove.to)}` : null, legalMoves: legalMoves(game).map(move => `${algebraic(move.from)}${algebraic(move.to)}${move.promotion || ""}`), outcome };
          },
        }));
        safe(context.registerTool({
          name: "start_new_chess_game",
          title: "开始新棋局",
          description: "清空当前进度并开始一盘新的离线人机对局。",
          inputSchema: { type: "object", properties: { playerColor: { type: "string", enum: ["white", "black"] } }, required: ["playerColor"], additionalProperties: false },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || !["white", "black"].includes(input.playerColor)) throw new Error("playerColor 必须是 white 或 black");
            startNewGame(input.playerColor === "white" ? "w" : "b");
            return { started: true, playerColor: input.playerColor };
          },
        }));
      } catch (_) { /* WebMCP is optional and feature-detected. */ }
    }

    elements.newGameButton.addEventListener("click", () => startNewGame());
    document.getElementById("resultNewGameButton").addEventListener("click", () => startNewGame());
    for (const id of ["resultCloseButton", "resultBoardButton"]) {
      document.getElementById(id).addEventListener("click", () => elements.resultDialog.close());
    }
    elements.undoButton.addEventListener("click", undo);
    elements.flipButton.addEventListener("click", () => { orientation = opponent(orientation); save(); renderBoard(); });
    elements.sideButtons.forEach(button => button.addEventListener("click", () => {
      preferredSide = button.dataset.side;
      renderSide();
      save();
      showToast(`已选择执${preferredSide === "w" ? "白" : "黑"}，点“新对局”开始`);
    }));

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
    });

    elements.installButton.addEventListener("click", async () => {
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        return;
      }
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      elements.installInstructions.textContent = ios
        ? "点 Safari 底部的分享按钮，再选择“添加到主屏幕”。请先打开一次，之后没有网络也能继续下棋。"
        : "在浏览器菜单里选择“安装应用”或“添加到主屏幕”。请先打开一次，之后没有网络也能继续下棋。";
      elements.installDialog.showModal();
    });

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    elements.powerSaveButton.addEventListener("click", () => {
      powerSaving = !powerSaving;
      applyPowerSaving();
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ powerSaving })); }
      catch (_) { showToast("设置暂时无法保存，本次使用仍生效。"); }
    });
    elements.offlineCheckButton.addEventListener("click", () => offlineManager?.check());
    updateConnection();
    load();
    applyPowerSaving();
    computerScheduler = window.ChessRuntime.createTurnScheduler({
      canRun: () => game.turn !== game.playerColor && !gameOutcome(game).over,
      isVisible: () => !document.hidden,
      onWaiting(value) { thinking = value; renderStatus(); },
      run() {
        const move = chooseComputerMove(game);
        if (move) performMove(move, true);
        else render();
      },
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        computerScheduler.cancel();
        sound.setEnabled(false);
        save();
      } else {
        applyPowerSaving();
        scheduleComputer();
      }
    });
    window.addEventListener("pagehide", () => { computerScheduler.cancel(); sound.stop(); save(); });
    window.addEventListener("pageshow", event => {
      if (event.persisted) { applyPowerSaving(); scheduleComputer(); offlineManager?.check(); }
    });
    render();
    registerWebMcp();
    if (game.turn !== game.playerColor && !gameOutcome(game).over) scheduleComputer();

    offlineManager = window.ChessOffline.start({
      version: document.getElementById("appVersion").textContent.replace(/^v/, ""),
      onStatus(status) { offlineStatus = status; updateConnection(); },
      beforeReload() { save(); sound.stop(); computerScheduler.cancel(); },
    });
  }

  if (typeof document !== "undefined") initApp();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createGame, cloneGame, applyCore, legalMoves, hasLegalMove, playUci, gameOutcome, inCheck, chooseComputerMove, algebraic, squareIndex };
  }
})();
