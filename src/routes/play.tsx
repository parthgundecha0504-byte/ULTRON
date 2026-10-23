import { createFileRoute } from "@tanstack/react-router";
import { UltronGame } from "@/components/UltronGame";
import type { Level } from "@/lib/ultron";

export const Route = createFileRoute("/play")({
  validateSearch: (s: Record<string, unknown>): { level: Level } => {
    const n = Number(s.level);
    return { level: (n === 2 || n === 3 ? n : 1) as Level };
  },
  head: () => ({
    meta: [
      { title: "Ultron — Engagement in Progress" },
      { name: "description", content: "Live blind chess match against Ultron." },
      { property: "og:title", content: "Ultron — Engagement in Progress" },
      { property: "og:description", content: "Live blind chess match against Ultron." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { level } = Route.useSearch();
  return <UltronGame level={level} />;
}
