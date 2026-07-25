import Link from "next/link";

const features = [
  {
    icon: "⚽",
    title: "ครอบคลุมฟุตบอลทั่วโลก",
    desc: "ลีก ทีม นักเตะ และโปรแกรมการแข่งขัน รวมไว้ใน API เดียว",
  },
  {
    icon: "🧩",
    title: "REST + JSON เรียบง่าย",
    desc: "เรียกด้วย HTTP ธรรมดา ได้ JSON สะอาด ใช้ได้กับทุกภาษา/เฟรมเวิร์ก",
  },
  {
    icon: "🔑",
    title: "API key + rate limit",
    desc: "จัดการสิทธิ์ด้วย API key พร้อมลิมิตต่อวันในตัว ปลอดภัยและคุมได้",
  },
  {
    icon: "⚡",
    title: "เร็วและอัปเดตอัตโนมัติ",
    desc: "ข้อมูลถูกเตรียมไว้ล่วงหน้าและซิงก์สม่ำเสมอ ตอบไวทุกคำขอ",
  },
];

const stats = [
  { value: "2,000+", label: "ลีกและถ้วย" },
  { value: "140+", label: "ประเทศ" },
  { value: "REST", label: "มาตรฐาน API" },
  { value: "ฟรี", label: "เริ่มต้นใช้งาน" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-pitch/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            KickData <span className="text-turf">⚽</span>
          </span>
          <Link
            href="/docs"
            className="text-sm font-medium text-neutral-300 hover:text-white"
          >
            เอกสาร
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,163,74,0.28),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-turf/40 bg-turf/10 px-4 py-1.5 text-sm font-medium text-turf">
            เริ่มใช้ฟรี · ไม่ต้องใช้บัตร
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            ข้อมูลฟุตบอล
            <br />
            <span className="text-turf">พร้อมใช้ในไม่กี่บรรทัด</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
            KickData คือ API ข้อมูลฟุตบอลสำหรับนักพัฒนา — ดึงลีก ทีม นักเตะ
            และโปรแกรมการแข่งขันด้วยคำขอเดียว เริ่มฟรี แล้วต่อยอดได้ทันที
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs"
              className="rounded-lg bg-turf px-6 py-3 font-semibold text-white shadow-lg shadow-turf/20 transition hover:bg-green-600"
            >
              ดูเอกสาร &amp; ทดลองยิง
            </Link>
            <a
              href="#example"
              className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-neutral-200 transition hover:border-white/40"
            >
              ดูตัวอย่างโค้ด
            </a>
          </div>
        </div>
      </section>

      {/* Code example */}
      <section id="example" className="mx-auto max-w-4xl px-6 py-12">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-neutral-400">ตัวอย่างการเรียก</span>
          </div>
          <div className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
            <pre className="text-neutral-300">
              <span className="text-turf">$</span> curl https://www.kickdata.dev/api/v1/teams?league=30 \{"\n"}
              {"    "}-H <span className="text-amber-300">&quot;x-api-key: YOUR_API_KEY&quot;</span>
            </pre>
            <pre className="mt-4 text-neutral-400">
{`{
  "league": "English Premier League",
  "count": 20,
  "data": [
    { "id": 112, "name": "Arsenal", "venue": "Emirates Stadium" },
    { "id": 119, "name": "Chelsea", "venue": "Stamford Bridge" },
    ...
  ]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">ทำไมต้อง KickData</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-turf/40"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-14 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-turf sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">พร้อมเริ่มแล้วหรือยัง?</h2>
        <p className="mx-auto mt-4 max-w-xl text-neutral-300">
          เปิดเอกสาร กดยิง API ดูผลจริงได้เลยในเบราว์เซอร์ ไม่ต้องตั้งค่าอะไร
        </p>
        <Link
          href="/docs"
          className="mt-8 inline-block rounded-lg bg-turf px-8 py-3.5 font-semibold text-white shadow-lg shadow-turf/20 transition hover:bg-green-600"
        >
          เริ่มที่เอกสาร
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
          <span>
            KickData <span className="text-turf">⚽</span> — API ข้อมูลฟุตบอลสำหรับนักพัฒนา
          </span>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-neutral-300">
              เอกสาร
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
