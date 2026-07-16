# China Clara

*China, clara.* — 拉美人理解中国、找到可信中国供应商的第一站。

内容驱动的 B2B 信息与采购沟通平台：读懂中国内容 + 中拉贸易情报 + 供应商目录 + 询盘沟通（平台不介入支付）。三语：es / en / zh。

> 本仓库由 knowledge-galaxy 原地重建。旧版完整快照：分支 `legacy-knowledge-galaxy`。

## 技术栈

Next.js App Router · React Three Fiber（3D 门户）· Supabase Postgres（四域 schema：content / catalog / crm / community）· Vercel

## 本地启动

```bash
npm install
cp .env.example .env.local   # 填入新 Supabase 项目密钥
npm run dev
```

## Supabase（新建项目，勿连旧库）

```bash
supabase link --project-ref <new-ref>
supabase db push
```

并在 Dashboard → Settings → API → Exposed schemas 加入 `content, catalog, crm, community`。

## 结构

- `app/` — `/` 3D 星系门户；`/[locale]/` SSR 内容页；`/api/v1/` 对外接口（API-first）
- `openapi.yaml` — 接口契约（`GET /api/v1/openapi` 可取）
- `src/lib/api/` — 统一信封 + PAT 鉴权
- `src/i18n/` — 三语字典
- `supabase/migrations/` — 四域基线 0001–0005
- 复用与待清理的 legacy 模块清单见 `AGENTS.md`

架构约定详见 `AGENTS.md`（`CLAUDE.md` 引用之）。
