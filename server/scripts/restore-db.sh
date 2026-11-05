#!/usr/bin/env bash
# backup-db.sh가 만든 .dump 파일을 DATABASE_URL이 가리키는 DB로 복구.
# 대상 DB의 기존 데이터를 덮어쓸 수 있으므로 실행 전 반드시 대상이 맞는지 확인할 것.
set -euo pipefail

cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "사용법: ./scripts/restore-db.sh <backups/snatty-db-YYYYMMDDTHHMMSSZ.dump>" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "[restore-db] FATAL: 파일을 찾을 수 없습니다 — $FILE" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[restore-db] FATAL: DATABASE_URL이 설정되지 않았습니다" >&2
  exit 1
fi

echo "[restore-db] 대상: $DATABASE_URL"
echo "[restore-db] 파일: $FILE"
read -r -p "이 DB의 기존 데이터를 덮어씁니다. 계속할까요? (yes 입력 시 진행) " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "[restore-db] 취소됨"
  exit 1
fi

pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$FILE"
echo "[restore-db] 완료"
