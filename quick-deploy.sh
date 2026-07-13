#!/usr/bin/env bash
#
# Mitsubishi Avatar QR Code demo - 一键构建并部署（前后端合一）
#
# 用法：
#   ./quick-deploy.sh
#   APP_PREFIX=/mitsubishi-avatar/ ./quick-deploy.sh
#
# 说明：
# - 默认从根目录构建的路径设置为 APP_PREFIX（默认 /），需要与反向代理网关
#   location 前缀保持一致。
# - 容器只监听 :8080，不对宿主机公网端口，只挂在 whip-network 上（与
#   共享反向代理 nginx 同一网络），由 nginx 反代到 mitsubishi-avatar-app:8080。
# - .env 同时包含前端构建期变量（VITE_ 前缀）和后端运行期变量，构建期变量
#   会作为 docker compose build 的 args 传入（参见 docker-compose.yml）。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
DEFAULT_PREFIX="/"
APP_PREFIX="${APP_PREFIX:-$DEFAULT_PREFIX}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "错误: 未找到 ${COMPOSE_FILE}"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "错误: 未找到 ${ENV_FILE}"
  echo "请先执行:"
  echo "  cp .env.example .env"
  echo "并填写 VITE_AGORA_APP_ID / AGORA_* / LLM_* / TTS_* / AVATAR_* 等变量后再重试。"
  exit 1
fi

if [[ "$APP_PREFIX" != /* ]]; then
  echo "错误: APP_PREFIX 必须以 / 开头，例如 /mitsubishi-avatar/"
  exit 1
fi
if [[ "$APP_PREFIX" != */ ]]; then
  APP_PREFIX="${APP_PREFIX}/"
fi

echo "==> Deploy dir: ${SCRIPT_DIR}"
echo "==> Frontend base path (APP_VITE_BASE_PATH): ${APP_PREFIX}"
echo "==> Ensure docker network whip-network exists"
docker network create whip-network >/dev/null 2>&1 || true

export APP_VITE_BASE_PATH="$APP_PREFIX"

echo "==> Build image and start service"
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> 完成（容器未绑定宿主机端口，需走反向代理）："
echo "    公网访问需走反向代理，与构建路径保持一致，例如："
echo "    页面:  https://<域名>${APP_PREFIX}"
echo "    API :  https://<域名>${APP_PREFIX%/}/api/...   （前端请求就以 ${APP_PREFIX%/}/api/... 相对当前 origin）"
