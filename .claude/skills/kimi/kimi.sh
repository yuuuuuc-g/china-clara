#!/usr/bin/env bash
# kimi.sh - 直接 HTTP 调用 Moonshot/Kimi chat completions API。
# 用途：超长文本分析、中文语境逻辑处理（128k 上下文）。
#
# 用法：
#   kimi.sh [-m model] [-s "system prompt"] [-f 文件]... [-T temperature] "指令"
#   （-T 不指定时不传 temperature，使用模型默认值；kimi-k3 只接受 1）
#   cat 长文.md | kimi.sh "总结这份文档的核心论点"
#   kimi.sh -f 报告A.md -f 报告B.md "对比两份报告的结论差异"
#
# 环境变量：
#   MOONSHOT_API_KEY   必填，Moonshot API key（sk-...）
#   MOONSHOT_BASE_URL  选填，默认 https://api.moonshot.cn/v1（国际版用 api.moonshot.ai）
#   KIMI_MODEL         选填，默认 kimi-k3（可用模型见 GET /models）
set -euo pipefail

: "${MOONSHOT_API_KEY:?MOONSHOT_API_KEY 未设置。请先 export MOONSHOT_API_KEY=sk-...}"
BASE_URL="${MOONSHOT_BASE_URL:-https://api.moonshot.cn/v1}"
MODEL="${KIMI_MODEL:-kimi-k3}"
SYSTEM_PROMPT="你是 Kimi。请用中文进行严谨、结构化的分析。"
TEMPERATURE=""
FILES=()

while getopts "m:s:f:T:" opt; do
  case "$opt" in
    m) MODEL="$OPTARG" ;;
    s) SYSTEM_PROMPT="$OPTARG" ;;
    f) FILES+=("$OPTARG") ;;
    T) TEMPERATURE="$OPTARG" ;;
    *) exit 2 ;;
  esac
done
shift $((OPTIND - 1))

PROMPT="${1:-}"
if [ -z "$PROMPT" ]; then
  echo "错误：缺少指令。用法见脚本头部注释。" >&2
  exit 2
fi

# 组装用户消息：指令 + 附件文件 + stdin（如有管道输入）
USER_CONTENT="$PROMPT"
for f in ${FILES[@]+"${FILES[@]}"}; do
  USER_CONTENT+=$'\n\n'"<file path=\"$f\">"$'\n'"$(cat "$f")"$'\n'"</file>"
done
if [ ! -t 0 ]; then
  STDIN_CONTENT="$(cat)"
  [ -n "$STDIN_CONTENT" ] && USER_CONTENT+=$'\n\n'"<stdin>"$'\n'"$STDIN_CONTENT"$'\n'"</stdin>"
fi

# temperature 仅在显式指定时传入：部分模型（如 kimi-k3）只接受固定值
BODY="$(jq -n \
  --arg model "$MODEL" \
  --arg system "$SYSTEM_PROMPT" \
  --arg user "$USER_CONTENT" \
  --arg temperature "$TEMPERATURE" \
  '{model: $model,
    messages: [{role: "system", content: $system}, {role: "user", content: $user}]}
   + (if $temperature == "" then {} else {temperature: ($temperature | tonumber)} end)')"

RESPONSE="$(curl -sS --max-time 570 "$BASE_URL/chat/completions" \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$BODY")"

if [ "$(jq -r '.error // empty' <<<"$RESPONSE")" != "" ]; then
  echo "Kimi API 错误：" >&2
  jq -r '.error' <<<"$RESPONSE" >&2
  exit 1
fi

jq -r '.choices[0].message.content' <<<"$RESPONSE"
