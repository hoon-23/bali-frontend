#!/bin/bash
# 버튼 로직(WorkoutPlanEngine) 단독 검증 — 앱·시뮬레이터 없이 맥에서 컴파일해 돌린다.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)/workout-engine-tests"
swiftc -O "$ROOT/modules/swayt-live-activity/ios/Shared/WorkoutPlanEngine.swift" "$ROOT/scripts/workout-engine-tests/main.swift" -o "$OUT"
"$OUT"
