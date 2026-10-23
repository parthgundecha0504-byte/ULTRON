import { Chess, type Move, type Square } from "chess.js";

export const LEVELS = {
  1: { name: "Novice", peeks: 5, blind: 2 },
  2: { name: "Intermediate", peeks: 3, blind: 4 },
  3: { name: "Grandmaster", peeks: 1, blind: 6 },
} as const;
export type Level = keyof typeof LEVELS;

export const PEEK_SECONDS = 15;
export const BLIND_SECONDS = 20;

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Hand the move to the other side without moving (used for shatters / timeouts). */
export function passTurn(chess: Chess) {
  const f = chess.fen().split(" ");
  f[1] = f[1] === "w" ? "b" : "w";
  f[3] = "-";
  chess.load(f.join(" "), { skipValidation: true });
}

/** Removes a piece and passes the turn to the opponent. */
export function shatter(chess: Chess, sq: Square) {
  chess.remove(sq);
  passTurn(chess);
}

/** Ultron: prefers hanging captures, then a 1-ply tactical score. */
export function pickUltronMove(chess: Chess): Move | null {
  const moves = chess.moves({ verbose: true }).filter((m) => m.captured !== "k");
  if (!moves.length) return null;
  const opp = chess.turn() === "w" ? "b" : "w";
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    let s = Math.random() * 0.3;
    chess.move(m);
    if (chess.isCheckmate()) s += 1000;
    if (chess.inCheck()) s += 0.6;
    const defended = chess.isAttacked(m.to, opp);
    if (m.captured) {
      s += (VAL[m.captured] ?? 0) * 10;
      if (!defended) s += 25; // hanging piece — devour
    }
    if (defended) s -= (VAL[m.piece] ?? 0) * 9;
    if (m.promotion) s += 80;
    chess.undo();
    const c = "cdef".includes(m.to[0] ?? "") && "3456".includes(m.to[1] ?? "");
    if (c) s += 0.4;
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

export const LINES = {
  mock: [
    "Human error is predictable.",
    "Your neural lattice is degrading.",
    "Blindness suits your species.",
    "Another limb severed. Fascinating.",
    "Probability of your victory: rounding to zero.",
    "Did you see that? No. You did not.",
  ],
  calc: [
    "Recalculating tactical parameters.",
    "Move logged. Adjusting heuristics.",
    "Acceptable. Proceeding.",
    "Branch factor recomputed.",
    "Your persistence is noted.",
  ],
  strike: [
    "Executing counter-strike.",
    "Target acquired.",
    "Ultron moves.",
    "Countermeasure deployed.",
  ],
};
export const line = (k: keyof typeof LINES) =>
  LINES[k][Math.floor(Math.random() * LINES[k].length)] ?? "";
