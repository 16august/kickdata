import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, leagues } from "@/lib/db/schema";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Schedule from "@/components/Schedule";
import Results from "@/components/Results";

export const metadata: Metadata = {
  title: "โชว์เคส — KickData",
  description:
    "ตัวอย่างการนำข้อมูลจาก KickData API ไป render จริง — โปรแกรมการแข่งขัน ผลการแข่งขัน และตารางคะแนน",
};

// Last slot waiting on data.
const upcoming = [
  {
    icon: "🏆",
    title: "ตารางคะแนน",
    desc: "อันดับ แต้ม ได้-เสีย และผลต่างประตูของแต่ละลีก",
  },
];

export default async function Showcase({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  // Only offer leagues that actually have a match ahead of them. Half the free
  // leagues have no fixtures ingested yet, and a switcher full of dead ends
  // reads as a broken page. New leagues appear here on their own once synced.
  const playable = await db
    .selectDistinct({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .innerJoin(fixtures, eq(fixtures.leagueId, leagues.id))
    .where(and(eq(leagues.isFree, true), gt(fixtures.kickoff, new Date())))
    .orderBy(asc(leagues.name));

  const requested = Number((await searchParams).league);
  const selected = playable.some((l) => l.id === requested) ? requested : playable[0]?.id;

  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,163,74,0.28),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-turf/40 bg-turf/10 px-4 py-1.5 text-sm font-medium text-turf">
            ข้อมูลจริง · อัปเดตวันละครั้ง
          </span>
          {/* break-words: Thai has no inter-word spaces, so a headline is one
              unbreakable token and would otherwise widen the whole page */}
          <h1 className="mt-6 break-words text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            ข้อมูลชุดเดียวกัน
            <br />
            <span className="text-turf">เอาไปทำอะไรได้บ้าง</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
            ทุกอย่างในหน้านี้ render จากข้อมูลชุดเดียวกับที่ API ส่งออก —
            ดูว่าข้อมูลดิบชุดหนึ่งประกอบออกมาหน้าตาเป็นยังไงได้บ้าง แล้วหยิบไปต่อยอดเป็นของตัวเอง
          </p>
        </div>
      </section>

      {/* Schedule */}
      {selected && (
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-2xl font-bold">📅 โปรแกรมการแข่งขัน</h2>
            <code className="font-mono text-xs text-neutral-500">
              GET /api/v1/fixtures?league={selected}
            </code>
          </div>

          {/* League switcher — plain links, so this stays a server render */}
          <div className="mt-6 flex flex-wrap gap-2">
            {playable.map((l) => (
              <Link
                key={l.id}
                href={`/showcase?league=${l.id}`}
                scroll={false}
                className={
                  l.id === selected
                    ? "rounded-full border border-turf/40 bg-turf/10 px-3.5 py-1.5 text-sm font-medium text-turf"
                    : "rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-neutral-400 transition hover:border-white/30 hover:text-neutral-200"
                }
              >
                {l.name}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Schedule leagueId={selected} />
          </div>
        </section>
      )}

      {/* Results */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-2xl font-bold">🥅 ผลการแข่งขันล่าสุด</h2>
          <code className="font-mono text-xs text-neutral-500">GET /api/v1/fixtures?league=…</code>
        </div>
        <div className="mt-8">
          <Results />
        </div>
      </section>

      {/* Still to come */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {upcoming.map((s) => (
            <div
              key={s.title}
              className="flex min-h-[14rem] flex-col rounded-xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="text-3xl">{s.icon}</div>
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-neutral-400">{s.desc}</p>
              <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-neutral-500">
                เร็ว ๆ นี้
              </div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
