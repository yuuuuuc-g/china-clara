---
name: kimi
description: 调用 Kimi (Moonshot) API 处理超长文本分析与中文语境逻辑任务。当遇到超出常规上下文的长文档（长报告、多文件对比、整本资料）需要总结/分析，或需要深度中文语境理解（语义辨析、中文商业文书、政策文本解读）时使用。Use when analyzing very long Chinese documents or tasks needing deep Chinese-context reasoning.
---

# Kimi 长文本 / 中文语境分析

通过 `kimi.sh` 直接 HTTP 调用 Moonshot API（无 MCP 中间层，最稳定路径）。

## 前置条件

需要 `MOONSHOT_API_KEY` 环境变量。未设置时脚本会报错并提示，此时告知用户配置：

```bash
export MOONSHOT_API_KEY=sk-...   # 写入 ~/.zshrc 持久化
```

## 用法

脚本位置：`.claude/skills/kimi/kimi.sh`（相对项目根目录）。

```bash
# 分析单个长文档
.claude/skills/kimi/kimi.sh -f docs/长报告.md "提炼这份报告的核心结论与风险点"

# 多文件对比
.claude/skills/kimi/kimi.sh -f a.md -f b.md "对比两份文档的观点差异"

# 管道输入
git log --format='%s' | .claude/skills/kimi/kimi.sh "从提交信息归纳本项目的开发主线"

# 自定义 system prompt 与模型
.claude/skills/kimi/kimi.sh -s "你是资深中拉贸易分析师" -m moonshot-v1-128k "..."
```

选项：`-m` 模型（默认 `kimi-k3`）、`-s` system prompt、`-f` 附件文件（可重复）、`-T` temperature（不指定则用模型默认；kimi-k3 只接受 1）。
可用模型随账户变化，用 `curl $MOONSHOT_BASE_URL/models` 查询；超长文本可选 `moonshot-v1-128k` 或 `moonshot-v1-auto`。

## 分工原则

- 超长文本、中文语境逻辑 → Kimi（本技能）
- 局部模块代码生成、可并行的编码劳动 → Codex（见 codex-delegate 技能）
- 结果始终由主 agent（Claude）审核后再采用，不直接落盘生产代码。
