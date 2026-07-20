# China Clara — Agent Memory

> China, clara. 拉美人理解中国、找到可信中国供应商的第一站。
> 内容驱动的 B2B 信息与采购沟通平台。平台不介入支付，只做询盘（RFQ），没有订单系统。
> 本仓库由 knowledge-galaxy 原地重建而来；旧版完整快照在分支 `legacy-knowledge-galaxy`。

## 架构铁律

1. **API-first**：主站前端也只是 `/api/v1` 的消费者。不得绕过网关层直接对外暴露 PostgREST。
2. **四域 schema**：Postgres 单库（**新建 Supabase 项目**，不要连旧 knowledge-galaxy 项目），
   schema 分域：`content`（文章+情报）、`catalog`（供应商+商品）、`crm`（用户+询盘+PAT）、`community`（用户文章）。
   新表必须归入其中一个域。Dashboard → Settings → API 需暴露这四个 schema。
3. **没有订单**：只有 `crm.inquiries` → `crm.inquiry_messages` → `crm.deal_outcomes`（选填回访）。不要创建 orders 表。
4. **双轨 UI**：根路径 `/` 是 3D 星系门户（保留自旧项目，行星待重映射到新模块）；
   `/es` `/en` `/zh` 是 SSR 内容页（SEO 生命线）。任何页面在无 3D 时必须完整可用。
5. **三语**：`/es`（拉美买家，优先）、`/en`（国际买家）、`/zh`（中国供应商）。
   内容表配 `*_translations`，AI 初翻 + `human_reviewed` 标记。

## API 约定

- 版本化：`/api/v1/...`，破坏性变更升 v2，v1 至少保留 12 个月。
- 统一信封：`{ "data": ..., "meta": {...}, "error": null }`（见 `src/lib/api/response.ts`）。
- 认证：终端用户 Supabase Auth JWT；外部项目 PAT（`Authorization: Bearer pat_...`），
  scope 白名单见 `src/lib/api/auth.ts`。
- OpenAPI spec 在 `openapi.yaml`，改接口必须同步改 spec。
- 数据库访问统一走 `src/lib/supabase/service.ts`（四域 untyped client）。
  各域查询层放 `src/lib/<域>/`（如 `crm/inquiries.ts`、`content/intel.ts`、`moderation/queries.ts`）。
  旧 `admin.ts` + `database.types.ts` 已随 legacy 模块删除；需类型时跑 `npm run supabase:types` 重新生成。

## 数据库迁移流程

1. 迁移基线已重置为 China Clara 四域（0001–0005）。旧 knowledge-galaxy 迁移在 git 历史 / legacy 分支。
2. 新增 `supabase/migrations/NNNN_描述.sql`（编号递增，永不修改已应用的迁移）。
3. `supabase db push` 应用到**新** Supabase 项目 → `npm run supabase:types` 重新生成类型。
4. 新表默认开 RLS，策略写在同一迁移文件。

## Legacy 处置清单（原地重建过渡期）

**保留并复用**：
- `src/components/canvas/` + `src/modules/canvas/` — 3D 门户（待改造：行星 → 读懂中国/情报/供应商/询盘/社区/API）。
- `src/modules/ai/provider-adapter.ts` — 翻译管线底座，被 `src/lib/crm/translate.ts` 与 `src/lib/content/translate-articles.ts` 消费。

**已清理（`claude/legacy-cleanup` 分支）**：
TS legacy 全部删除，仅剩 `src/modules/{ai,canvas}`。
移除清单：`src/modules/{archive,refinery,galaxy-shell,social-signals,intelligence,rag,retrieval}`、对应 `app/*` 与 `app/api/*` 页面路由（含 `intelligence-ingest-status`）、`src/lib/{apac-supply-chain,ai-domain-events,local-search,export-utils,database.types}.ts`、`src/lib/supabase/admin.ts`、旧 `config/intelligence-sources.json`。
情报管线已重写为 `src/lib/content/intel-ingest.ts`（中拉贸易源 `config/intelligence-sources-latam.json`，落 content 域）。

**待处理（可选，需人工确认后再动）**：
- `ingest.py`、`rag-pipeline/`、`requirements.txt`、`tests/test_ingest.py` — Python RAG 侧。
  原注「按需保留」；其 TS 消费方（`modules/rag,retrieval`）已删。
  若不重建「读懂中国站内问答」，可整体清理。

## 质量门禁（提交前必须全绿）

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **china-clara** (1234 symbols, 2681 relationships, 98 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/china-clara/context` | Codebase overview, check index freshness |
| `gitnexus://repo/china-clara/clusters` | All functional areas |
| `gitnexus://repo/china-clara/processes` | All execution flows |
| `gitnexus://repo/china-clara/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
