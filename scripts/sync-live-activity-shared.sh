#!/bin/bash
# 앱(modules/swayt-live-activity/ios/Shared)과 위젯(targets/widget)이 같이 컴파일하는 Swift 파일을 맞춘다.
# 서로 다른 Xcode 타겟이라 파일을 공유할 수 없어서 위젯 쪽은 복사본이다. 원본은 항상 modules 쪽이다.
# 사용: scripts/sync-live-activity-shared.sh        (복사)
#       scripts/sync-live-activity-shared.sh --check (다르면 실패 — 빌드 전 확인용)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/modules/swayt-live-activity/ios/Shared"
DST="$ROOT/targets/widget"
status=0
for f in "$SRC"/*.swift; do
  name="$(basename "$f")"
  if [ "$1" = "--check" ]; then
    if ! cmp -s "$f" "$DST/$name"; then echo "다름: $name"; status=1; fi
  else
    cp "$f" "$DST/$name"
    echo "복사: $name"
  fi
done
exit $status
