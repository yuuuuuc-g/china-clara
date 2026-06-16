# Knowledge Galaxy

Knowledge Galaxy is a 3D, planet-driven knowledge workspace built with Next.js, Three.js, Supabase, and the Vercel AI SDK. Each planet opens a module for creating, storing, retrieving, or monitoring knowledge.

The project is evolving from a working prototype into a deployable knowledge operating system. Current focus areas are repository-backed data access, typed Supabase schema management, AI orchestration, and scheduled intelligence ingestion.

## Core Modules

- **Solar System Canvas**: the main 3D entry point, built with `@react-three/fiber`, `@react-three/drei`, and Three.js.
- **Archive**: central document repository backed by Supabase tables such as `topics`, `documents`, and `analytical_sessions`.
- **Analytical Pipeline**: the Mars cognitive refinery workflow, with phase orchestration extracted into `src/modules/refinery/phase.ts`.
- **Exocortex Retrieval**: Neptune RAG search over `rag_books` and `rag_chunks`, with retrieval logic in `src/modules/retrieval/agent.ts`.
- **Knowledge Graph**: graph-oriented archive exploration.
- **Macro Intelligence / Saturn / APAC Supply Chain**: intelligence modules fed by a shared RSS source registry and scheduled ingestion pipeline.

## Tech Stack

- **Framework**: Next.js App Router
- **Frontend**: React, Tailwind CSS, TipTap, `react-markdown`
- **3D**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **AI**: Vercel AI SDK, OpenAI-compatible providers, DeepSeek, Gemini, OpenRouter, SiliconFlow, Kimi
- **Database**: Supabase Postgres with generated TypeScript types
- **Testing**: Vitest, React Testing Library, ESLint, TypeScript
- **Deployment**: Vercel with scheduled cron routes

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
touch .env.local
```

Fill it with the variables in the Environment Variables section below.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required for Supabase-backed features:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is preferred for server routes. `SUPABASE_KEY` is kept as a compatibility fallback in older API routes.

Required for production cron protection:

```bash
CRON_SECRET=
```

AI provider variables, depending on which modules you run:

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
KIMI_API_KEY=
KIMI_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
SILICONFLOW_API_KEY=
SILICONFLOW_EMBEDDING_MODEL=
REFINERY_MODEL=
```

Supabase type generation variables:

```bash
SUPABASE_PROJECT_ID=
SUPABASE_PROJECT_REF=
SUPABASE_DB_URL=
SUPABASE_CLI_BIN=
```

## Supabase Workflow

Schema migrations live in `supabase/migrations/`.

Current migration baseline:

- `0001_archive_core.sql`
- `0002_rag_tables.sql`
- `0003_daily_briefings.sql`
- `0004_rls_policies.sql`
- `0005_intelligence_pipeline.sql`

Apply migrations to a linked remote Supabase project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Generate TypeScript database types after schema changes:

```bash
SUPABASE_PROJECT_ID=<project-ref> npm run supabase:types
```

For a local Supabase stack:

```bash
npm run supabase:types:local
```

The generated file is `src/lib/database.types.ts`. Do not edit it by hand.

### Supabase CLI Note

On Apple Silicon, prefer installing the Supabase CLI with Homebrew:

```bash
brew install supabase/tap/supabase
```

The npm `supabase` wrapper can fail on `darwin-arm64` with `No matching Supabase CLI binary package found`.

## Intelligence Ingestion

Shared intelligence sources are defined in:

```text
config/intelligence-sources.json
```

The scheduled pipeline is implemented in:

```text
src/modules/intelligence/pipeline.ts
app/api/cron/intelligence-ingest/route.ts
```

It performs:

1. Source registry sync into `intelligence_sources`
2. RSS fetch into `source_articles`
3. Module-specific scans into `macro_intel_items`, `apac_supply_chain_signals`, and `daily_briefings`
4. Job and scan-state writes into `ingestion_jobs` and `module_scan_state`

Vercel cron is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/intelligence-ingest",
      "schedule": "0 23 * * *"
    }
  ]
}
```

Manually trigger production ingestion:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://www.gaoyucan.com/api/cron/intelligence-ingest
```

The command should return `{"status":"completed", ...}` when the pipeline succeeds.

Local snapshot scripts still exist for development and debugging:

```bash
npm run fetch:macro-intel
npm run fetch:apac-supply-chain
```

Runtime pages should read from APIs and Supabase-backed tables, not from committed JSON snapshots.

## Project Structure

```text
app/                         Next.js pages and API routes
config/intelligence-sources.json
docs/adr/                    Architecture decision records
src/components/canvas/       3D solar system components
src/components/hud/          Planet module HUDs and consoles
src/components/ui/           Shared UI primitives
src/lib/                     Supabase clients and app utilities
src/modules/                 Domain modules and testable application logic
supabase/migrations/         Database migrations
scripts/                     Maintenance and data scripts
```

Key module seams:

- `src/modules/archive/repository.ts`
- `src/modules/rag/repository.ts`
- `src/modules/retrieval/agent.ts`
- `src/modules/refinery/phase.ts`
- `src/modules/prompts/registry.ts`
- `src/modules/ai/provider-adapter.ts`
- `src/modules/intelligence/repository.ts`
- `src/modules/intelligence/pipeline.ts`
- `src/modules/canvas/runtime-controller.ts`

## Quality Gates

Run tests:

```bash
npm test
```

Run TypeScript:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Build production output:

```bash
npm run build
```

## Deployment

The project is deployed on Vercel. After pushing changes that affect routes, environment variables, `vercel.json`, or scheduled jobs, make sure the latest commit has been deployed.

Typical deployment flow:

1. Push the current branch to GitHub.
2. Let the Vercel GitHub integration build the latest commit.
3. Confirm required environment variables exist in Vercel.
4. Manually trigger `/api/cron/intelligence-ingest` once to verify scheduled ingestion.

## Domain Language

Project vocabulary and relationships live in `CONTEXT.md`. Keep README practical and keep detailed domain language there.

---

# 中文说明

Knowledge Galaxy 是一个以 3D 行星系统为入口的知识工作台，基于 Next.js、Three.js、Supabase 和 Vercel AI SDK 构建。每个行星对应一个知识模块，用于创建、存储、检索、分析或监控知识。

当前项目正在从“功能已经跑起来的原型”演进为一个可部署、可维护、可长期扩展的知识操作系统。近期重点包括：Repository 化的数据访问、Supabase schema 类型化管理、AI 编排抽象，以及后台定时情报抓取。

## 核心模块

- **Solar System Canvas**：主 3D 入口，使用 `@react-three/fiber`、`@react-three/drei` 和 Three.js。
- **Archive**：中央文档库，基于 Supabase 的 `topics`、`documents`、`analytical_sessions` 等表。
- **Analytical Pipeline**：Mars 认知精炼工作流，阶段编排位于 `src/modules/refinery/phase.ts`。
- **Exocortex Retrieval**：Neptune RAG 检索模块，基于 `rag_books` 和 `rag_chunks`，检索逻辑位于 `src/modules/retrieval/agent.ts`。
- **Knowledge Graph**：用于浏览和探索 Archive 的图谱视图。
- **Macro Intelligence / Saturn / APAC Supply Chain**：基于统一 RSS 信息源注册表和后台定时任务的情报模块。

## 技术栈

- **框架**：Next.js App Router
- **前端**：React、Tailwind CSS、TipTap、`react-markdown`
- **3D**：Three.js、`@react-three/fiber`、`@react-three/drei`
- **AI**：Vercel AI SDK、OpenAI-compatible providers、DeepSeek、Gemini、OpenRouter、SiliconFlow、Kimi
- **数据库**：Supabase Postgres，使用自动生成的 TypeScript 类型
- **测试**：Vitest、React Testing Library、ESLint、TypeScript
- **部署**：Vercel，包含定时 cron route

## 本地启动

安装依赖：

```bash
npm install
```

创建本地环境变量文件：

```bash
touch .env.local
```

根据下面的环境变量说明填写 `.env.local`。

启动开发服务器：

```bash
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

Supabase 相关功能需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

服务端 route 优先使用 `SUPABASE_SERVICE_ROLE_KEY`。`SUPABASE_KEY` 目前作为旧 API route 的兼容 fallback 保留。

生产环境 cron 鉴权需要：

```bash
CRON_SECRET=
```

AI provider 相关变量按需配置：

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
KIMI_API_KEY=
KIMI_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
SILICONFLOW_API_KEY=
SILICONFLOW_EMBEDDING_MODEL=
REFINERY_MODEL=
```

Supabase 类型生成相关变量：

```bash
SUPABASE_PROJECT_ID=
SUPABASE_PROJECT_REF=
SUPABASE_DB_URL=
SUPABASE_CLI_BIN=
```

## Supabase 工作流

数据库迁移文件位于 `supabase/migrations/`。

当前迁移基线：

- `0001_archive_core.sql`
- `0002_rag_tables.sql`
- `0003_daily_briefings.sql`
- `0004_rls_policies.sql`
- `0005_intelligence_pipeline.sql`

把迁移推送到已 link 的远程 Supabase 项目：

```bash
supabase link --project-ref <project-ref>
supabase db push
```

修改 schema 后重新生成 TypeScript 类型：

```bash
SUPABASE_PROJECT_ID=<project-ref> npm run supabase:types
```

如果使用本地 Supabase：

```bash
npm run supabase:types:local
```

生成文件是 `src/lib/database.types.ts`，不要手动编辑。

### Supabase CLI 注意事项

Apple Silicon 设备建议用 Homebrew 安装 Supabase CLI：

```bash
brew install supabase/tap/supabase
```

npm 的 `supabase` wrapper 在 `darwin-arm64` 上可能报错：`No matching Supabase CLI binary package found`。

## 情报抓取管线

统一信息源定义在：

```text
config/intelligence-sources.json
```

定时抓取管线位于：

```text
src/modules/intelligence/pipeline.ts
app/api/cron/intelligence-ingest/route.ts
```

它会执行：

1. 同步信息源注册表到 `intelligence_sources`
2. 抓取 RSS 并写入 `source_articles`
3. 按模块策略生成 `macro_intel_items`、`apac_supply_chain_signals` 和 `daily_briefings`
4. 写入 `ingestion_jobs` 和 `module_scan_state`，记录任务状态和扫描状态

Vercel cron 配置在 `vercel.json`：

```json
{
  "crons": [
    {
      "path": "/api/cron/intelligence-ingest",
      "schedule": "0 23 * * *"
    }
  ]
}
```

手动触发生产环境抓取：

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://www.gaoyucan.com/api/cron/intelligence-ingest
```

成功时应返回类似 `{"status":"completed", ...}`。

本地开发和调试用的 snapshot 脚本仍然保留：

```bash
npm run fetch:macro-intel
npm run fetch:apac-supply-chain
```

运行时页面应从 API 和 Supabase 表读取数据，不应依赖提交到仓库的 JSON snapshot。

## 项目结构

```text
app/                         Next.js 页面和 API routes
config/intelligence-sources.json
docs/adr/                    架构决策记录
src/components/canvas/       3D 太阳系组件
src/components/hud/          行星模块 HUD 和控制台
src/components/ui/           通用 UI 原语
src/lib/                     Supabase client 和应用工具
src/modules/                 领域模块与可测试应用逻辑
supabase/migrations/         数据库迁移
scripts/                     维护和数据脚本
```

关键模块边界：

- `src/modules/archive/repository.ts`
- `src/modules/rag/repository.ts`
- `src/modules/retrieval/agent.ts`
- `src/modules/refinery/phase.ts`
- `src/modules/prompts/registry.ts`
- `src/modules/ai/provider-adapter.ts`
- `src/modules/intelligence/repository.ts`
- `src/modules/intelligence/pipeline.ts`
- `src/modules/canvas/runtime-controller.ts`

## 质量检查

运行测试：

```bash
npm test
```

运行 TypeScript 检查：

```bash
npx tsc --noEmit
```

运行 lint：

```bash
npm run lint
```

构建生产版本：

```bash
npm run build
```

## 部署

项目部署在 Vercel。凡是修改了 route、环境变量、`vercel.json` 或定时任务相关逻辑，都需要确认最新 commit 已经部署。

典型部署流程：

1. 推送当前分支到 GitHub。
2. 等待 Vercel GitHub integration 构建最新 commit。
3. 确认 Vercel 里已经配置必要环境变量。
4. 手动触发一次 `/api/cron/intelligence-ingest`，确认定时抓取链路可用。

## 领域语言

项目词汇和关系定义在 `CONTEXT.md`。README 主要保留实用说明，详细领域语言放在 `CONTEXT.md` 中维护。
