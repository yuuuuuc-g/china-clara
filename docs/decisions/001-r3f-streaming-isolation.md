# 001 - R3F Streaming Isolation

## Symptom

在 8GB 内存设备上执行 RAG 流式生成（尤其是 Mars Crucible/Neptune 检索流）时，前端出现 `WebGL context lost inside R3F Canvas`，随后 HUD 重置并中断生成体验。

## Root Cause

AI SDK 的流式 token 回传会触发高频 React state 更新。  
当这些高频状态与包裹 R3F `<Canvas>` 的组件处于同一渲染链时，会导致 3D 树被迫参与灾难性高频重渲染，主线程与 GPU 调度被阻塞，最终触发 WebGL context lost。

## Solution

1. **React.memo 物理隔离 3D 画布**
   - 将 `<Canvas>` 抽离为独立场景组件，并使用 `React.memo` 包裹。
   - 顶层页面仅向场景传入少量低频 props（例如聚焦状态、点击回调），避免流式数据穿透到 3D 渲染树。

2. **State Colocation（状态下沉）**
   - 将高频流式状态（`aiResponse`、`agentLogs`、`isGenerating` 等）下沉到末端 HUD 组件。
   - 让流式更新只影响普通 HTML HUD，不触发 3D Scene 重渲染。

3. **渲染压力降级**
   - Canvas 使用低压参数：`dpr={[1, 1.5]}`、`antialias: false`、`powerPreference: "high-performance"`、`preserveDrawingBuffer: true`。

## Rule

**绝对禁止在包裹 `<Canvas>` 的父组件或全局状态中存放高频更新的值。**  
任何 streaming token、日志增量、输入联想、计时器跳动等高频数据，都必须被限制在 HUD/文本域等末端组件内，且不得作为 Scene props 传递。
