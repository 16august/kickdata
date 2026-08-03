// teams.logo holds real crest URLs, but the image host rejects bursts: loading
// one or two works, loading a page's worth in parallel fails every request.
// Monograms until we proxy and cache them ourselves.
export function initials(name: string | null) {
  if (!name) return "?";
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function TeamMonogram({ name }: { name: string | null }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-semibold tracking-wide text-neutral-400">
      {initials(name)}
    </span>
  );
}
