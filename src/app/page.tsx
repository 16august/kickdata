import Link from "next/link";
import { TIERS } from "@/lib/tiers";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-turf">
          KickData
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Football data, ready to ship.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-300">
          A simple REST API for leagues, fixtures and standings. Start free with
          selected leagues, upgrade to Pro for full coverage and advanced data.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/docs"
            className="rounded-lg bg-turf px-5 py-2.5 font-medium text-white hover:bg-green-600"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Plans</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(Object.keys(TIERS) as Array<keyof typeof TIERS>).map((tier) => {
            const t = TIERS[tier];
            return (
              <div
                key={tier}
                className="rounded-xl border border-neutral-800 bg-black/20 p-6"
              >
                <h3 className="text-xl font-semibold">{t.label}</h3>
                <ul className="mt-4 space-y-2 text-neutral-300">
                  <li>{t.dailyQuota.toLocaleString()} requests / day</li>
                  <li>{t.allPaidLeagues ? "All leagues" : "Free leagues only"}</li>
                  <li>{t.advancedData ? "Advanced data" : "Core data"}</li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
