import { createFileRoute } from "@tanstack/react-router";
import { UltronGame } from "@/components/UltronGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ultron — Blind Chess vs the Machine" },
      { name: "description", content: "Peek, then play blind. Cyberpunk chess against an omniscient AI." },
      { property: "og:title", content: "Ultron — Blind Chess vs the Machine" },
      { property: "og:description", content: "Peek, then play blind. Cyberpunk chess against an omniscient AI." },
    ],
  }),
  component: UltronGame,
});
