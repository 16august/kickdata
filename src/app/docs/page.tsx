import Link from "next/link";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/leagues",
    desc: "List leagues available to your tier.",
  },
  {
    method: "GET",
    path: "/api/v1/fixtures?league=<id>",
    desc: "List fixtures (matches) for a league.",
  },
  {
    method: "GET",
    path: "/api/v1/standings?league=<id>",
    desc: "League table / standings.",
  },
];

export default function Docs() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/" className="text-sm text-turf hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">API Reference</h1>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="mt-2 text-neutral-300">
          Every request must include your API key in the{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5">x-api-key</code>{" "}
          header. Rate limits and league access depend on your plan.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-sm">
          {`curl https://your-app.vercel.app/api/v1/leagues \\
  -H "x-api-key: YOUR_API_KEY"`}
        </pre>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="mt-4 space-y-3">
          {ENDPOINTS.map((e) => (
            <div
              key={e.path}
              className="rounded-lg border border-neutral-800 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-turf px-2 py-0.5 text-xs font-bold text-white">
                  {e.method}
                </span>
                <code className="text-sm">{e.path}</code>
              </div>
              <p className="mt-2 text-sm text-neutral-400">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Responses</h2>
        <ul className="mt-2 space-y-1 text-neutral-300">
          <li>
            <code>200</code> — success
          </li>
          <li>
            <code>401</code> — missing / invalid API key
          </li>
          <li>
            <code>403</code> — league not available on your tier
          </li>
          <li>
            <code>429</code> — daily rate limit exceeded
          </li>
        </ul>
      </section>
    </main>
  );
}
