import Link from "next/link";

// Shared across every page — layout.tsx renders only <body>{children}</body>.
export default function SiteNav() {
  return (
    <nav className="sticky top-0 z-10 border-b border-white/5 bg-pitch/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          KickData <span className="text-turf">⚽</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/showcase"
            className="text-sm font-medium text-neutral-300 hover:text-white"
          >
            โชว์เคส
          </Link>
          <Link
            href="/docs"
            className="text-sm font-medium text-neutral-300 hover:text-white"
          >
            เอกสาร
          </Link>
        </div>
      </div>
    </nav>
  );
}
