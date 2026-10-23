import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Chess, type Square } from "chess.js";
import {
  LEVELS,
  PEEK_SECONDS,
  BLIND_SECONDS,
  type Level,
  pickUltronMove,
  shatter,
  passTurn,
  line,
} from "@/lib/ultron";
import { vaultSlam, siren, blip, shatterSfx } from "@/lib/sfx";

type Phase = "peek" | "blind";
type LogEntry = { id: number; text: string; kind: "mock" | "calc" | "sys" };
type Over = { title: string; detail: string } | null;

const FILES = "abcdefgh";

interface G {
  chess: Chess;
  human: "w" | "b";
  level: Level;
  phase: Phase;
  peeksLeft: number;
  blindLeft: number;
  deadline: number;
  total: number;
  thinking: boolean;
  visual: number;
  blind: number;
  moves: number;
  over: Over;
}

function fresh(level: Level): G {
  return {
    chess: new Chess(),
    human: Math.random() < 0.5 ? "w" : "b",
    level,
    phase: "peek",
    peeksLeft: LEVELS[level].peeks,
    blindLeft: 0,
    deadline: Date.now() + PEEK_SECONDS * 1000,
    total: PEEK_SECONDS,
    thinking: false,
    visual: 0,
    blind: 0,
    moves: 0,
    over: null,
  };
}

export function UltronGame({ level }: { level: Level }) {
  const [started, setStarted] = useState(false);
  const g = useRef<G>(fresh(1));
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const [now, setNow] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [flash, setFlash] = useState(false);
  const [breach, setBreach] = useState(0);
  const [shattered, setShattered] = useState<Square | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);

  const say = (text: string, kind: LogEntry["kind"]) =>
    setLog((l) => [{ id: ++logId.current, text, kind }, ...l].slice(0, 14));

  const startTimer = (phase: Phase) => {
    const s = phase === "peek" ? PEEK_SECONDS : BLIND_SECONDS;
    g.current.total = s;
    g.current.deadline = Date.now() + s * 1000;
  };

  const shiftToBlind = () => {
    const st = g.current;
    st.phase = "blind";
    st.blindLeft = LEVELS[st.level].blind;
    setFlash(true);
    vaultSlam();
    setTimeout(() => setFlash(false), 400);
    say("VISUAL LINK SEVERED. Navigate by memory.", "sys");
  };

  const shiftToPeek = () => {
    const st = g.current;
    st.phase = "peek";
    st.peeksLeft = LEVELS[st.level].peeks;
    say("Optical uplink restored. Peek window open.", "sys");
  };

  const checkOver = (): boolean => {
    const st = g.current;
    const c = st.chess;
    if (!c.isGameOver()) return false;
    let over: Over;
    if (c.isCheckmate())
      over =
        c.turn() === st.human
          ? { title: "HUMANITY DEFEATED", detail: "Ultron delivered checkmate." }
          : { title: "MACHINE OVERRIDDEN", detail: "Human cognitive grit prevails." };
    else over = { title: "STALEMATE PROTOCOL", detail: "Neither intelligence could prevail." };
    st.over = over;
    st.deadline = 0;
    say(over.detail, "sys");
    bump();
    return true;
  };

  /** Called once white's turn is finished: Ultron strikes, then the next human clock begins. */
  const ultronTurn = () => {
    const st = g.current;
    if (checkOver()) return;
    st.thinking = true;
    st.deadline = 0;
    bump();
    setTimeout(() => {
      if (st !== g.current) return;
      const m = pickUltronMove(st.chess);
      if (m) {
        st.chess.move(m);
        if (m.captured) say(`${line("strike")} ${m.san}`, "mock");
        blip(180);
      } else passTurn(st.chess);
      st.thinking = false;
      if (checkOver()) return;
      startTimer(st.phase);
      bump();
    }, 650);
  };

  const humanTurnDone = () => {
    const st = g.current;
    if (st.phase === "peek") {
      st.peeksLeft -= 1;
      if (st.peeksLeft <= 0) shiftToBlind();
    } else {
      st.blindLeft -= 1;
      if (st.blindLeft <= 0) shiftToPeek();
    }
    ultronTurn();
  };

  const onTimeout = useCallback(() => {
    const st = g.current;
    setSelected(null);
    if (st.phase === "peek") {
      say("Peek window expired.", "sys");
      shiftToBlind();
      startTimer("blind");
      bump();
    } else {
      st.blind += 1;
      st.blindLeft += 2;
      say(`Turn forfeited. ${line("mock")}`, "mock");
      siren();
      passTurn(st.chess);
      ultronTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const st = g.current;
      if (!st.over && !st.thinking && st.deadline && t >= st.deadline) {
        st.deadline = 0;
        onTimeout();
      }
    }, 100);
    return () => clearInterval(id);
  }, [started, onTimeout]);

  const begin = () => {
    g.current = fresh(level);
    setSelected(null);
    setLog([]);
    say(`Ultron online. Difficulty: ${LEVELS[level].name}.`, "sys");
    const side = g.current.human === "w" ? "WHITE" : "BLACK";
    say(`Allegiance randomized: you command ${side}.`, "sys");
    setStarted(true);
    blip(660);
    bump();
    if (g.current.human === "b") ultronTurn();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { begin(); }, [level]);

  const clickSquare = (sq: Square) => {
    const st = g.current;
    const c = st.chess;
    if (st.over || st.thinking || c.turn() !== st.human) return;
    const piece = c.get(sq);
    if (piece?.color === st.human) {
      setSelected(sq);
      blip(520);
      return;
    }
    if (!selected) return;
    const from = selected;
    setSelected(null);
    const legal = c.moves({ square: from, verbose: true }).find((m) => m.to === sq);

    if (st.phase === "peek") {
      if (!legal) return;
      c.move({ from, to: sq, promotion: "q" });
      st.moves++;
      const hanging = c.isAttacked(sq, st.human === "w" ? "b" : "w") && !c.isAttacked(sq, st.human);
      if (hanging) {
        st.visual++;
        say(`Visual array blunder. ${line("mock")}`, "mock");
      } else say(line("calc"), "calc");
      humanTurnDone();
      return;
    }

    // Blind phase
    if (legal) {
      c.move({ from, to: sq, promotion: "q" });
      st.moves++;
      say(line("calc"), "calc");
      humanTurnDone();
      return;
    }
    const moving = c.get(from);
    st.blind++;
    if (moving?.type === "k") {
      st.blindLeft *= 2;
      setBreach((b) => b + 1);
      siren();
      say(`KING BREACH. Blind cycle doubled to ${st.blindLeft}. ${line("mock")}`, "mock");
      bump();
      return;
    }
    shatter(c, from);
    setShattered(from);
    setTimeout(() => setShattered(null), 500);
    shatterSfx();
    say(`Unit shattered at ${from}. ${line("mock")}`, "mock");
    humanTurnDone();
  };

  const st = g.current;
  const blindMode = st.phase === "blind";
  const remaining = st.deadline ? Math.max(0, st.deadline - now) / 1000 : 0;
  const pct = st.deadline ? Math.min(100, (remaining / st.total) * 100) : 0;
  const legalTargets =
    !blindMode && selected
      ? new Set(st.chess.moves({ square: selected, verbose: true }).map((m) => m.to))
      : new Set<string>();
  const board = st.chess.board();
  const flip = st.human === "b";

  return (
    <div className="scanlines min-h-screen bg-void font-mono text-foreground">
      {flash && <div className="fixed inset-0 z-50 bg-foreground" />}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:flex-row lg:p-8">
        {/* Sidebar */}
        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <h1 className="glow-red font-display text-5xl font-extrabold tracking-[0.3em] text-primary">
            ULTRON
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Human cognitive grit vs. omniscient machine
          </p>

          {started && (
            <>
              <div
                className={`border px-3 py-2 text-sm font-bold tracking-widest ${
                  blindMode
                    ? "blink border-primary bg-primary/10 text-primary"
                    : "border-accent bg-accent/10 text-accent"
                }`}
              >
                {blindMode ? "🕶️ VISUAL LINK SEVERED" : "👁️ PEEK OPERATIONAL"}
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{st.thinking ? "ULTRON COMPUTING" : "CLOCK"}</span>
                  <span className="tabular-nums">{remaining.toFixed(1)}s</span>
                </div>
                <div className="h-2 w-full bg-secondary">
                  <div
                    className={`h-full transition-[width] duration-100 ${blindMode ? "bg-primary" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <Stat label="Peeks left" value={blindMode ? 0 : st.peeksLeft} />
                <Stat label="Blind left" value={blindMode ? st.blindLeft : LEVELS[st.level].blind} red />
                <Stat label="Visual blunders" value={st.visual} />
                <Stat label="Uplink blunders" value={st.blind} red />
              </div>

              <div className="flex-1 border border-border bg-background p-3">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                  &gt; systems log
                </p>
                <ul className="flex max-h-72 flex-col gap-1 overflow-hidden text-xs">
                  {log.map((e, i) => (
                    <li
                      key={e.id}
                      className={
                        e.kind === "mock"
                          ? "text-primary"
                          : e.kind === "sys"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }
                      style={{ opacity: 1 - i * 0.06 }}
                    >
                      [ULTRON] {e.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs tracking-widest text-muted-foreground">
                YOU: {st.human === "w" ? "WHITE" : "BLACK"} · {LEVELS[st.level].name.toUpperCase()}
              </div>
              <Link
                to="/"
                className="border border-primary py-2 text-center text-xs font-bold tracking-widest text-primary hover:bg-primary/10"
              >
                QUIT GAME
              </Link>
            </>
          )}
        </aside>

        {/* Board */}
        <main className="flex flex-1 items-center justify-center">
          <div
            key={breach}
            className={`grid aspect-square w-full max-w-[640px] grid-cols-8 grid-rows-8 border border-border ${breach ? "breach" : ""} ${!started ? "opacity-40" : ""}`}
          >
            {(flip ? [...board].reverse() : board).map((row, dr) =>
              (flip ? [...row].reverse() : row).map((cell, df) => {
                const r = flip ? 7 - dr : dr;
                const f = flip ? 7 - df : df;
                const sq = `${FILES[f]}${8 - r}` as Square;
                const light = (r + f) % 2 === 0;
                const isSel = selected === sq;
                const isTarget = legalTargets.has(sq);
                return (
                  <button
                    key={sq}
                    onClick={() => started && clickSquare(sq)}
                    className={`relative flex items-center justify-center ${light ? "bg-sq-light" : "bg-sq-dark"} ${isSel ? "ring-2 ring-inset ring-primary" : ""}`}
                    aria-label={sq}
                  >
                    {df === 0 && (
                      <span className="absolute left-1 top-0.5 text-[9px] text-muted-foreground">{8 - r}</span>
                    )}
                    {dr === 7 && (
                      <span className="absolute bottom-0.5 right-1 text-[9px] text-muted-foreground">{FILES[f]}</span>
                    )}
                    {shattered === sq && (
                      <span className="absolute h-1/2 w-1/2 animate-ping rounded-full bg-primary" />
                    )}
                    {cell &&
                      (cell.color === st.human ? (
                        <span
                          className={`node-white flex h-[62%] w-[62%] items-center justify-center bg-foreground font-display text-lg font-extrabold text-void transition-all duration-500 sm:text-2xl ${
                            blindMode ? "rounded-full" : "rounded-sm"
                          }`}
                        >
                          <span className={`transition-opacity duration-500 ${blindMode ? "opacity-0" : "opacity-100"}`}>
                            {cell.type.toUpperCase()}
                          </span>
                        </span>
                      ) : (
                        <span className="node-red flex h-[56%] w-[56%] items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground sm:text-lg">
                          {cell.type.toUpperCase()}
                        </span>
                      ))}
                    {isTarget && (
                      <span
                        className={`pointer-events-none absolute rounded-full bg-accent ${cell ? "h-[80%] w-[80%] bg-transparent ring-2 ring-accent" : "h-3 w-3"}`}
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </main>
      </div>

      {st.over && started && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/95 p-4">
          <div className="w-full max-w-lg border-2 border-foreground bg-void p-8 text-center">
            <h2 className="glow-red font-display text-3xl font-extrabold tracking-widest text-primary">
              {st.over.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{st.over.detail}</p>
            <table className="mt-6 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-foreground text-void">
                  <th className="p-2">Metric</th>
                  <th className="p-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                <Row k="Visual Array Blunders" v={st.visual} />
                <Row k="Severed Uplink Blunders" v={st.blind} red />
                <Row k="Total Blunders" v={st.visual + st.blind} />
                <Row k="Moves Executed" v={st.moves} />
                <Row k="Threat Level" v={LEVELS[st.level].name} />
              </tbody>
            </table>
            <button
              onClick={begin}
              className="mt-6 w-full bg-primary py-3 font-display text-sm font-bold tracking-widest text-primary-foreground"
            >
              RE-ENGAGE
            </button>
            <Link to="/" className="mt-3 block text-xs tracking-widest text-muted-foreground hover:text-foreground">
              RETURN TO HOME
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, red }: { label: string; value: number; red?: boolean }) {
  return (
    <div className="border border-border bg-background p-2">
      <div className={`font-display text-2xl font-bold ${red ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ k, v, red }: { k: string; v: string | number; red?: boolean }) {
  return (
    <tr className="border-b border-border">
      <td className="p-2">{k}</td>
      <td className={`p-2 text-right font-bold ${red ? "text-primary" : ""}`}>{v}</td>
    </tr>
  );
}
