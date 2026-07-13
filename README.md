# Knowledge Galaxy

Knowledge Galaxy is a 3D solar system interface built with Next.js and Three.js.
This branch contains the frontend UI shell only: the interactive 3D galaxy scene, planet focus interactions, and the HUD overlay.
All backend functionality (Supabase persistence, AI pipelines, RAG retrieval, intelligence ingestion, cron jobs) has been removed.

## What Remains

- **Solar System Canvas**: the 3D entry point, built with `@react-three/fiber`, `@react-three/drei`, and Three.js.
- **Planet Focus**: click a planet to focus the camera and open its detail panel; press Escape or "Back to Galaxy" to return.
- **HUD Overlay**: mission header and glass-panel detail HUD rendered above the canvas.

## Tech Stack

- **Framework**: Next.js App Router
- **Frontend**: React, Tailwind CSS, Framer Motion
- **3D**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **State**: Zustand
- **Testing**: Vitest, React Testing Library, ESLint, TypeScript

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Only one optional variable remains, for site-wide Basic Auth in production:

```bash
SITE_PASSWORD=
```

## Project Structure

```text
app/                         Next.js entry page and layout
src/components/canvas/       3D solar system components
src/components/hud/          HUD overlay components
src/components/ui/           Shared UI primitives
src/lib/                     App utilities
src/modules/canvas/          Canvas runtime profile logic
src/store/                   Zustand solar system store
```

## Quality Gates

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

# 中文说明

Knowledge Galaxy 是一个基于 Next.js 和 Three.js 的 3D 太阳系界面。
当前分支只保留前端 UI 外壳:交互式 3D 星系场景、行星聚焦交互和 HUD 覆盖层。
所有后端功能(Supabase 持久化、AI 管线、RAG 检索、情报抓取、定时任务)均已移除。

## 保留内容

- **Solar System Canvas**:3D 主入口,使用 `@react-three/fiber`、`@react-three/drei` 和 Three.js。
- **行星聚焦**:点击行星聚焦相机并打开详情面板;按 Escape 或 "Back to Galaxy" 返回。
- **HUD 覆盖层**:画布之上的任务标题和玻璃面板详情 HUD。

## 本地启动

```bash
npm install
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

仅剩一个可选变量,用于生产环境全站 Basic Auth:

```bash
SITE_PASSWORD=
```
