#!/usr/bin/env bash
#
# Mitsubishi Avatar QR Code demo - 主机一键构建并部署（前后端一体）
#
# 用法：
#   ./quick-deploy.sh
#   APP_PREFIX=/avatar/ ./quick-deploy.sh
#
# 说明：
# - 默认把前端构建基路径设置为 APP_PREFIX（默认 /avatar/），
#   需与前置网关 location 前缀保持一致。
# - Express 仅容器内监听 :8080，不映射到宿主机。
# - 仅 whip-network 内其它容器（如前置网关）可访问 mitsubishi-avatar-app:8080。
# - 构建：容器内 NODE_ENV=production + vite build --mode production。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
DEFAULT_PREFIX="/avatar/"
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
  echo "错误: APP_PREFIX 必须以 / 开头，例如 /avatar/"
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
export NODE_ENV=production

echo "==> Build image and start service (Vite --mode production)"
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Done（未绑定宿主机端口；勿将 :8080 暴露到公网）"
echo "    公网访问须走前置网关，与构建前缀一致，例如："
echo "    SPA:  https://<域名>${APP_PREFIX}"
echo "    API:  https://<域名>${APP_PREFIX%/}/api/...   （同页请求即 ${APP_PREFIX%/}/api/... 相对当前 origin）"
