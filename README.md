# KickData ⚽

บริการ **API ข้อมูลฟุตบอล** — เปิดให้ใช้ฟรีบางลีก และมี subscription tier (Pro)
สำหรับลีกเพิ่มเติมและข้อมูลที่ advance ขึ้น

ข้อมูลถูกดึงมาจาก [iSportsAPI](https://www.isportsapi.com/) เก็บลง DB ของเราเอง
(Neon Postgres) แล้ว re-serve ผ่าน API ของ KickData เพื่อให้ควบคุม caching และ
tier gating ได้เอง

## Tech Stack

| ส่วน | ใช้ |
|------|-----|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | Neon (serverless Postgres) |
| ORM | Drizzle ORM |
| Cron | Vercel Cron |
| Styling | Tailwind CSS |
| Deploy | Vercel (ไม่ใช้ Docker) |

## โครงสร้างโปรเจ็ค

```
src/
├─ app/
│  ├─ page.tsx                 landing page
│  ├─ docs/page.tsx            API docs
│  └─ api/
│     ├─ v1/{leagues,fixtures,standings}/route.ts   public API (ต้องมี API key)
│     └─ cron/sync/route.ts    Vercel cron → ingest จาก iSportsAPI
└─ lib/
   ├─ db/{schema.ts,index.ts}  Drizzle schema + Neon client
   ├─ env.ts                   typed env validation (zod) + APP_ENV
   ├─ isports/client.ts        wrapper เรียก iSportsAPI
   ├─ tiers.ts                 นิยาม tier (free/pro) + quota
   ├─ auth/{apiKey.ts,rateLimit.ts}   ตรวจ key + จำกัด request
   └─ api/guard.ts             รวม auth + rate limit ให้ route ใช้
```

## Environments (dev / prod)

แยก environment เป็น **dev** กับ **prod** ด้วย **Neon branches** (project เดียว, คนละ branch)
โดยไม่กระทบข้อมูลจริง

| Layer | Dev | Prod |
|-------|-----|------|
| Neon branch | `development` | `production` (main) |
| ไฟล์ env (local) | `.env.development.local` | `.env.production.local` |
| Vercel env scope | Preview + Development | Production |
| `APP_ENV` (runtime) | `dev` | `prod` |

- `APP_ENV` ถูก derive อัตโนมัติจาก `VERCEL_ENV`/`NODE_ENV` (ดู [`src/lib/env.ts`](src/lib/env.ts)) — ไม่ต้องเซ็ตเอง
- `env.ts` validate env ทุกตัวด้วย zod ตอน request แรก → ถ้าตั้งค่าผิด/ขาด จะ error ชัดเจนทันที

## เริ่มต้นใช้งาน

> ⚠️ ยังไม่ได้ `npm install` — โปรเจ็คนี้เป็น scaffold ทำตามขั้นตอนด้านล่างเพื่อรัน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้าง Neon branch "development" จาก console.neon.tech
#    (branch main = production) — ก๊อป connection string ของแต่ละ branch

# 3. ตั้งค่า env (แยก 2 ไฟล์ จาก .env.example — ทั้งคู่ถูก gitignore)
cp .env.example .env.development.local   # ใส่ DATABASE_URL ของ dev branch
cp .env.example .env.production.local    # ใส่ DATABASE_URL ของ prod branch
#    ทั้ง 2 ไฟล์ ใส่ ISPORTS_API_KEY + CRON_SECRET ด้วย

# 4. สร้างตารางในแต่ละ branch
npm run db:generate       # สร้าง migration จาก schema (ใช้ร่วมกันทั้ง 2 env)
npm run db:migrate:dev    # apply ลง dev branch
npm run db:migrate:prod   # apply ลง prod branch

# 5. รัน dev server (โหลด .env.development.local อัตโนมัติ → ต่อ dev branch)
npm run dev               # http://localhost:3002
```

## การใช้งาน API

ทุก request ต้องส่ง API key ผ่าน header `x-api-key`

```bash
curl http://localhost:3002/api/v1/leagues -H "x-api-key: YOUR_KEY"
curl "http://localhost:3002/api/v1/fixtures?league=1" -H "x-api-key: YOUR_KEY"
curl "http://localhost:3002/api/v1/standings?league=1" -H "x-api-key: YOUR_KEY"
```

**Tiers** (แก้ได้ที่ [`src/lib/tiers.ts`](src/lib/tiers.ts))

| Tier | Requests/วัน | ลีก | ข้อมูล |
|------|-------------|-----|--------|
| Free | 1,000 | เฉพาะลีกฟรี (`is_free = true`) | core |
| Pro  | 100,000 | ทุกลีก | advanced |

### การออก API key (ตอนนี้ยังทำ manual)

เก็บเฉพาะ **hash** ของ key ในตาราง `api_keys` ไม่เก็บ key ดิบ — สร้าง key แล้ว hash
ด้วย `hashKey()` ใน [`src/lib/auth/apiKey.ts`](src/lib/auth/apiKey.ts) ก่อน insert
(ขั้นตอนถัดไปสามารถทำ endpoint/หน้า dashboard สำหรับออก key ได้)

## Data Sync (Cron)

`vercel.json` ตั้ง cron ให้เรียก `/api/cron/sync` ทุก 30 นาที — endpoint นี้ป้องกันด้วย
`CRON_SECRET` เรียกเองได้ด้วย:

```bash
curl http://localhost:3002/api/cron/sync -H "authorization: Bearer $CRON_SECRET"
```

> หมายเหตุ: ฟังก์ชัน fetch จาก iSportsAPI ต่อไว้แล้ว แต่ส่วน **transform + upsert
> ลง DB** ยังเป็น TODO (ต้องมี API key จริงเพื่อดู response shape จริงก่อน map fields) —
> ดู comment ใน [`src/app/api/cron/sync/route.ts`](src/app/api/cron/sync/route.ts)

## Deploy บน Vercel

1. Push ขึ้น Git แล้ว import โปรเจ็คใน Vercel
2. ตั้ง env vars ใน Project Settings → Environment Variables แล้ว **scope แยก environment**:
   - **Production** → `DATABASE_URL` ของ prod branch
   - **Preview + Development** → `DATABASE_URL` ของ dev branch
   - `ISPORTS_API_KEY`, `CRON_SECRET` ใส่ทุก environment (หรือแยก key ถ้าต้องการ)
3. (แนะนำ) ติดตั้ง **Neon–Vercel integration** — auto สร้าง branch ต่อ preview deployment
   ให้ทุก PR มี DB ของตัวเอง ไม่ชนกับ dev/prod
4. Vercel จะรัน cron ตาม `vercel.json` ให้อัตโนมัติ (Cron ต้องใช้แพลน Pro ของ Vercel)
