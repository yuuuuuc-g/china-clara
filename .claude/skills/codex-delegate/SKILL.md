---
name: codex-delegate
description: 把局部模块的具体编码劳动委派给 Codex（codex exec），支持多任务并发分担。当有边界清晰、可独立完成的代码生成任务（写一个组件、一批测试、一个工具函数模块），或需要并行处理多个互不依赖的编码子任务时使用。Use to delegate well-scoped module-level code generation to Codex, optionally in parallel.
---

# Codex 编码委派

通过 `codex-delegate.sh` 包装 `codex exec` 非交互调用。Codex CLI 与桌面端共享登录态（`~/.codex/auth.json`），无需额外配置。

## 用法

脚本位置：`.claude/skills/codex-delegate/codex-delegate.sh`。

```bash
# 单任务：在指定目录生成模块（默认 workspace-write 沙箱，禁网）
.claude/skills/codex-delegate/codex-delegate.sh -C src/modules/foo \
  "实现 X 功能的纯函数模块，含单元测试，风格遵循相邻文件"

# 只读分析
.claude/skills/codex-delegate/codex-delegate.sh -s read-only "审查 src/lib/api/ 的错误处理一致性"
```

选项：`-C` 工作目录、`-m` 模型、`-s` 沙箱（`read-only` / `workspace-write`）、`-o` 结果文件。
stdout 只输出 Codex 的最终答复；过程日志在 stderr。

## 并发模式（高并发分担编码劳动）

互不依赖的子任务各起一个后台实例，各自限定不同的 `-C` 目录避免写冲突：

```bash
.claude/skills/codex-delegate/codex-delegate.sh -C src/modules/a -o /tmp/task-a.md "任务A" &
.claude/skills/codex-delegate/codex-delegate.sh -C src/modules/b -o /tmp/task-b.md "任务B" &
wait
```

主 agent 用 Bash 工具的 `run_in_background` 各起一个调用即可，无需 `&`。

## 委派纪律

1. 任务必须自包含：写明目标文件路径、接口约定、风格要求，Codex 看不到本会话上下文。
2. 并发任务的写入目录不得重叠。
3. Codex 产出必须由主 agent 审核（读 diff、跑 `npm test && npx tsc --noEmit && npm run lint`）后才算完成 - 质量门禁不因委派而豁免。
4. 多轮往返式协作用已注册的 codex MCP server（`.mcp.json`），一次性任务用本脚本。
