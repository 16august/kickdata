import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
        <span>
          KickData <span className="text-turf">⚽</span> — API ข้อมูลฟุตบอลสำหรับนักพัฒนา
        </span>
        <div className="flex gap-6">
          <Link href="/showcase" className="hover:text-neutral-300">
            โชว์เคส
          </Link>
          <Link href="/docs" className="hover:text-neutral-300">
            เอกสาร
          </Link>
        </div>
      </div>
    </footer>
  );
}
