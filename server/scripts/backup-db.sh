#!/usr/bin/env bash
# server/prisma/schema.prisma의 실사용자 데이터(User·JournalEntry 등)를 pg_dump로 백업.
# Neon 등 매니지드 호스팅의 자동 백업 여부와 무관하게 동작하는 독립적인 방어선.
#
# pg_dump는 클라이언트 버전이 대상 서버 버전보다 낮으면 무조건 실행을 거부한다
# ("server version mismatch"). 대상 Postgres가 업그레이드되면 이 스크립트를 실행할
# 머신의 pg_dump도 그 버전 이상으로 맞춰야 한다 — `psql "$DATABASE_URL" -c 'select version();'`
# 로 서버 버전 확인 가능(server/README.md § Database backups 참고, 2026-09-06 실제로
# 16.x pg_dump로 Postgres 18 Neon을 백업하려다 이 에러로 막힌 걸 리허설 중 발견).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup-db] FATAL: DATABASE_URL이 설정되지 않았습니다 (.env 또는 환경변수 확인)" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/snatty-db-${TIMESTAMP}.dump"

echo "[backup-db] pg_dump 시작 → $OUT_FILE"
pg_dump --format=custom --file="$OUT_FILE" "$DATABASE_URL"
echo "[backup-db] 완료 — $(du -h "$OUT_FILE" | cut -f1)"

# 최근 KEEP_COUNT개만 로컬에 남기고 오래된 백업 정리(기본 14개 — 매일 1회면 약 2주치).
KEEP_COUNT="${KEEP_COUNT:-14}"
# shellcheck disable=SC2012
ls -1t "$BACKUP_DIR"/snatty-db-*.dump 2>/dev/null | tail -n +$((KEEP_COUNT + 1)) | xargs -r rm -f
