import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LEVELS, type Level } from "@/lib/ultron";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ultron — Blind Chess vs the Machine" },
      { name: "description", content: "Peek, then play blind. Cyberpunk chess against an omniscient AI." },
      { property: "og:title", content: "Ultron — Blind Chess vs the Machine" },
      { property: "og:description", content: "Peek, then play blind. Cyberpunk chess against an omniscient AI." },
    ],
  }),
  component: Home,
});

function Home() {
  const [level, setLevel] = useState<Level>(1);
  return (
    <div className="scanlines flex min-h-screen flex-col items-center justify-center bg-void p-6 font-mono text-foreground">
      <h1 className="glow-red font-display text-6xl font-extrabold tracking-[0.3em] text-primary sm:text-8xl">
        ULTRON
      </h1>
      <p className="mt-4 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Human cognitive grit vs. an omniscient machine
      </p>
      <p className="mt-6 max-w-md text-center text-sm text-muted-foreground">
        Peek at the board, then play blind from memory. Y
      </p>

      <div className="mt-10 grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {([1, 2, 3] as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`border p-4 text-left transition ${
              level === l
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="font-display text-sm font-bold">L{l} · {LEVELS[l].name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {LEVELS[l].peeks} peeks → {LEVELS[l].blind} blind
            </div>
          </button>
        ))}
      </div>

      <Link
        to="/play"
        search={{ level }}
        className="mt-10 bg-primary px-16 py-4 font-display text-lg font-bold tracking-[0.3em] text-primary-foreground transition hover:opacity-90"
      >
        START
      </Link>
    </div>
  );
}
