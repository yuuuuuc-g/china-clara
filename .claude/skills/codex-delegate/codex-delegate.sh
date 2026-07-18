#!/usr/bin/env bash
# codex-delegate.sh - 把局部模块的编码任务委派给 Codex（非交互 codex exec）。
# 支持多实例并发：调用方用后台进程各起一个实例即可。
#
# 用法：
#   codex-delegate.sh [-C 工作目录] [-m model] [-s sandbox] [-o 结果文件] "任务描述"
#
# 默认：
#   -C 当前目录
#   -s workspace-write（允许写工作目录，禁网；只读分析用 -s read-only）
#   -o 未指定时，最终答复写到 stdout 末尾（codex 过程日志在 stderr 可见）
set -euo pipefail

DIR="$(pwd)"
SANDBOX="workspace-write"
MODEL=""
OUT=""

while getopts "C:m:s:o:" opt; do
  case "$opt" in
    C) DIR="$OPTARG" ;;
    m) MODEL="$OPTARG" ;;
    s) SANDBOX="$OPTARG" ;;
    o) OUT="$OPTARG" ;;
    *) exit 2 ;;
  esac
done
shift $((OPTIND - 1))

TASK="${1:-}"
if [ -z "$TASK" ]; then
  echo "错误：缺少任务描述。用法见脚本头部注释。" >&2
  exit 2
fi

CLEANUP=""
if [ -z "$OUT" ]; then
  OUT="$(mktemp -t codex-delegate)"
  CLEANUP="$OUT"
fi

# 过程日志走 stderr，stdout 只输出最终答复，便于程序化消费。
# stdin 必须显式关闭：codex exec 在非 TTY stdin 下会等待管道输入，后台运行时会永久挂起。
codex exec \
  --skip-git-repo-check \
  -s "$SANDBOX" \
  -C "$DIR" \
  ${MODEL:+-m "$MODEL"} \
  -o "$OUT" \
  "$TASK" </dev/null 1>&2

cat "$OUT"
[ -n "$CLEANUP" ] && rm -f "$CLEANUP"
exit 0
