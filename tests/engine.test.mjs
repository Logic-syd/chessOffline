import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  createGame, cloneGame, applyCore, legalMoves, hasLegalMove, playUci,
  gameOutcome, inCheck, chooseComputerMove, squareIndex,
} = require("../dist/app.js");

function play(moves) {
  return moves.split(/\s+/).filter(Boolean).reduce(playUci, createGame());
}

function position(pieces, overrides = {}) {
  const game = createGame();
  game.board.fill(null);
  for (const [square, piece] of Object.entries(pieces)) game.board[squareIndex(square)] = piece;
  return Object.assign(game, { castling: "", positions: [], ...overrides });
}

function perft(game, depth) {
  if (depth === 0) return 1;
  return legalMoves(game).reduce((sum, move) => sum + perft(applyCore(game, move, false), depth - 1), 0);
}

function freezeGame(game) {
  Object.freeze(game.board);
  Object.freeze(game.moveLog);
  Object.freeze(game.positions);
  if (game.lastMove) Object.freeze(game.lastMove);
  return Object.freeze(game);
}

test("starting position has 20 moves and standard perft totals through depth 3", () => {
  const game = createGame();
  assert.equal(legalMoves(game).length, 20);
  assert.equal(perft(game, 2), 400);
  assert.equal(perft(game, 3), 8902);
});

test("short-circuit legality agrees with complete move generation", () => {
  const samples = [
    createGame(),
    play("e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6"),
    play("f2f3 e7e5 g2g4 d8h4"),
    position({ h8: "k", f7: "K", g6: "Q" }, { turn: "b" }),
    position({ e1: "K", e5: "P", e8: "r", a8: "k", d5: "p" }, { ep: squareIndex("d6") }),
    position({ e1: "K", e8: "k", a7: "P" }),
  ];
  let game = createGame();
  // Exercise both sides across reproducible, legal, changing positions.
  for (let ply = 0; ply < 32; ply += 1) {
    samples.push(game);
    const moves = legalMoves(game);
    if (!moves.length) break;
    game = applyCore(game, moves[(ply * 7 + 3) % moves.length]);
  }
  for (const sample of samples) {
    for (const color of ["w", "b"]) {
      assert.equal(hasLegalMove(sample, color), legalMoves(sample, color).length > 0);
    }
  }
});

test("check, checkmate and stalemate remain distinct", () => {
  const check = position({ h8: "k", f6: "K", h1: "R" }, { turn: "b" });
  assert.equal(inCheck(check, "b"), true);
  assert.equal(hasLegalMove(check), true);
  assert.equal(gameOutcome(check).over, false);

  const mate = play("f2f3 e7e5 g2g4 d8h4");
  assert.equal(inCheck(mate, "w"), true);
  assert.equal(hasLegalMove(mate), false);
  assert.deepEqual(gameOutcome(mate), { over: true, type: "checkmate", winner: "b" });
  assert.equal(chooseComputerMove(mate), null);

  const stalemate = position({ h8: "k", f7: "K", g6: "Q" }, { turn: "b" });
  assert.equal(inCheck(stalemate, "b"), false);
  assert.equal(hasLegalMove(stalemate), false);
  assert.deepEqual(gameOutcome(stalemate), { over: true, type: "stalemate", winner: null });
  assert.equal(chooseComputerMove(stalemate), null);
});

test("castling moves the king and rook without changing the previous board", () => {
  for (const color of ["w", "b"]) {
    const game = freezeGame(position({ a1: "R", e1: "K", h1: "R", a8: "r", e8: "k", h8: "r" }, { turn: color, castling: "KQkq" }));
    const rank = color === "w" ? "1" : "8";
    assert.equal(legalMoves(game).filter(move => move.castle).length, 2);
    for (const [destination, rookDestination, rookSource] of [["g", "f", "h"], ["c", "d", "a"]]) {
      const next = playUci(game, `e${rank}${destination}${rank}`);
      assert.equal(next.board[squareIndex(`${destination}${rank}`)], color === "w" ? "K" : "k");
      assert.equal(next.board[squareIndex(`${rookDestination}${rank}`)], color === "w" ? "R" : "r");
      assert.equal(next.board[squareIndex(`${rookSource}${rank}`)], null);
      assert.equal(next.board[squareIndex(`e${rank}`)], null);
      assert.equal(next.castling, color === "w" ? "kq" : "KQ");
    }
    assert.equal(game.board[squareIndex(`e${rank}`)], color === "w" ? "K" : "k");
  }
  const attacked = position({ e1: "K", h1: "R", a8: "k", f8: "r" }, { castling: "K" });
  assert.equal(legalMoves(attacked).some(move => move.castle), false);
});

test("en passant removes the captured pawn and cannot expose the king", () => {
  const game = freezeGame(play("e2e4 a7a6 e4e5 d7d5"));
  const next = playUci(game, "e5d6");
  assert.equal(next.board[squareIndex("d6")], "P");
  assert.equal(next.board[squareIndex("d5")], null);
  assert.equal(next.board[squareIndex("e5")], null);
  assert.equal(next.ep, null);
  assert.equal(game.board[squareIndex("d5")], "p");

  const pinned = position({ e1: "K", e5: "P", e8: "r", a8: "k", d5: "p" }, { ep: squareIndex("d6") });
  assert.equal(legalMoves(pinned).some(move => move.enPassant), false);
});

test("promotion preserves all four choices for both colors", () => {
  for (const color of ["w", "b"]) {
    const game = freezeGame(position({ e1: "K", e8: "k", [color === "w" ? "a7" : "a2"]: color === "w" ? "P" : "p" }, { turn: color }));
    const from = color === "w" ? "a7" : "a2";
    const to = color === "w" ? "a8" : "a1";
    assert.deepEqual(legalMoves(game).filter(move => move.promotion).map(move => move.promotion).sort(), ["b", "n", "q", "r"]);
    for (const promotion of ["q", "r", "b", "n"]) {
      const next = playUci(game, `${from}${to}${promotion}`);
      assert.equal(next.board[squareIndex(to)], color === "w" ? promotion.toUpperCase() : promotion);
      assert.equal(next.board[squareIndex(from)], null);
    }
  }
});

test("simulation reuses read-only histories; committed moves and clones own their histories", () => {
  const game = freezeGame(play("e2e4 e7e5"));
  const before = JSON.stringify(game);
  const move = legalMoves(game)[0];
  const simulated = applyCore(game, move, false);
  assert.notEqual(simulated.board, game.board);
  assert.equal(simulated.moveLog, game.moveLog);
  assert.equal(simulated.positions, game.positions);
  assert.notEqual(simulated.lastMove, game.lastMove);
  const nextSimulation = applyCore(freezeGame(simulated), legalMoves(simulated)[0], false);
  assert.equal(nextSimulation.positions, game.positions);

  for (const next of [applyCore(game, move), cloneGame(game), applyCore(simulated, legalMoves(simulated)[0])]) {
    assert.notEqual(next.board, game.board);
    assert.notEqual(next.moveLog, game.moveLog);
    assert.notEqual(next.positions, game.positions);
    assert.notEqual(next.lastMove, game.lastMove);
  }
  const real = applyCore(game, move);
  assert.equal(real.moveLog.length, game.moveLog.length + 1);
  assert.equal(real.positions.length, game.positions.length + 1);
  assert.equal(JSON.stringify(game), before);
});

test("all AI difficulties choose legal moves without changing long frozen histories", () => {
  const game = play("e2e4 e7e5 g1f3 b8c6 f1b5 a7a6");
  game.moveLog = Array.from({ length: 160 }, (_, i) => `move-${i}`);
  game.positions = Array.from({ length: 161 }, (_, i) => `position-${i}`);
  freezeGame(game);
  const legal = legalMoves(game);
  for (const difficulty of ["easy", "standard", "challenge"]) {
    const before = JSON.stringify(game);
    const move = chooseComputerMove(game, difficulty);
    assert.ok(legal.some(candidate => JSON.stringify(candidate) === JSON.stringify(move)), `${difficulty} returns a legal move`);
    assert.equal(JSON.stringify(game), before, `${difficulty} leaves the game unchanged`);
  }
  assert.equal(hasLegalMove(game), true);
});
