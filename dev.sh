#!/usr/bin/env bash
# 本機開發 / 寫文模式
# 跑兩個 server：
#   1. decap-server (port 8081) — Decap CMS 的本機 git proxy
#   2. http.server  (port 8080) — 站本身
#
# 用法：
#   ./dev.sh           # 啟動兩個 server
#   ./dev.sh stop      # 停掉兩個 server
#
# 寫完文：
#   git add posts/ assets/uploads/
#   git commit -m "..."
#   git push
# 內容會在 1–2 分鐘內出現在 https://henrychao521.github.io

set -e

cd "$(dirname "$0")"
PIDFILE_DECAP=".dev-decap.pid"
PIDFILE_HTTP=".dev-http.pid"

cmd="${1:-start}"

stop_servers() {
  for pf in "$PIDFILE_DECAP" "$PIDFILE_HTTP"; do
    if [ -f "$pf" ]; then
      pid=$(cat "$pf")
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" && echo "✓ Stopped $pf (PID $pid)"
      fi
      rm -f "$pf"
    fi
  done
  # 雙保險：把 8080/8081 上的孤兒 process 也殺掉
  lsof -ti:8080 2>/dev/null | xargs -r kill 2>/dev/null || true
  lsof -ti:8081 2>/dev/null | xargs -r kill 2>/dev/null || true
}

case "$cmd" in
  stop)
    stop_servers
    exit 0
    ;;

  start|"")
    # 先清掉舊的
    stop_servers

    echo ""
    echo "🚀 啟動 Henry × LivingTech 本機寫作環境"
    echo "─────────────────────────────────────"

    # 1) Decap server (port 8081)
    echo "📝 啟動 decap-server (Port 8081)..."
    npx -y decap-server > .dev-decap.log 2>&1 &
    echo $! > "$PIDFILE_DECAP"
    sleep 2

    # 2) Static HTTP server (port 8080)
    echo "🌐 啟動 static server  (Port 8080)..."
    python3 -m http.server 8080 > .dev-http.log 2>&1 &
    echo $! > "$PIDFILE_HTTP"
    sleep 1

    echo ""
    echo "✅ 環境就緒！"
    echo ""
    echo "  📰 站本身：       http://localhost:8080/"
    echo "  ✍️  寫作後台：    http://localhost:8080/admin/"
    echo ""
    echo "  📂 文章存到：    posts/maker/  或  posts/blog/"
    echo "  📁 圖片存到：    assets/uploads/"
    echo ""
    echo "  停止：./dev.sh stop"
    echo "  Log： .dev-decap.log / .dev-http.log"
    echo ""
    ;;

  *)
    echo "用法：$0 [start|stop]"
    exit 1
    ;;
esac
