import Foundation

// 버튼 로직(WorkoutPlanEngine)의 단독 검증. 앱·시뮬레이터 없이 맥에서 돈다: scripts/test-workout-engine.sh
var failures = 0
func check(_ cond: Bool, _ name: String) {
  if cond { print("  ok  \(name)") } else { print("FAIL  \(name)"); failures += 1 }
}

let t0 = Date(timeIntervalSince1970: 1_800_000_000)
func at(_ sec: Double) -> Date { t0.addingTimeInterval(sec) }

func weightLog(_ id: String, targetSets: Int = 3) -> [String: Any] {
  ["id": id, "name": id, "targetSets": targetSets, "targetReps": 10, "targetWeight": 20, "targetDurationSeconds": 0,
   "actualSets": "0", "actualReps": "10", "actualWeight": "20", "actualDurationSeconds": "0", "completed": false,
   "setTimings": [[String: Any]](), "durationStartedAt": NSNull(), "setStartedAt": NSNull(), "setReminderId": NSNull(),
   "isCardio": false]
}
func cardioLog(_ id: String) -> [String: Any] {
  var l = weightLog(id, targetSets: 0); l["isCardio"] = true; l["targetDurationSeconds"] = 1200; return l
}
func makePlan(_ logs: [[String: Any]]) -> [String: Any] {
  ["sessionId": "s1", "isRealSession": true, "isFinished": false, "logs": logs, "expandedId": logs.first?["id"] as Any,
   "sessionTitle": "전신", "someFutureField": 42]
}
func logAt(_ plan: [String: Any], _ i: Int) -> [String: Any] { WorkoutPlanEngine.logs(plan)[i] }
func timings(_ plan: [String: Any], _ i: Int) -> [[String: Any]] { logAt(plan, i)["setTimings"] as? [[String: Any]] ?? [] }

print("세트 시작·완료")
var p = makePlan([weightLog("a"), weightLog("b")])
var o = WorkoutPlanEngine.apply(.startSet, to: p, now: at(0))
check(o.changed && (logAt(o.plan, 0)["setStartedAt"] as? String) != nil, "startSet은 시작 시각을 기록한다")
let first = logAt(o.plan, 0)["setStartedAt"] as? String
let dup = WorkoutPlanEngine.apply(.startSet, to: o.plan, now: at(5))
check(!dup.changed && (logAt(dup.plan, 0)["setStartedAt"] as? String) == first, "이미 진행 중이면 startSet은 시작 시각을 덮어쓰지 않는다")
check((o.plan["someFutureField"] as? Int) == 42, "모르는 필드는 보존된다")

var withReminder = o.plan
var l0 = logAt(withReminder, 0); l0["setReminderId"] = "rem-1"
var all = WorkoutPlanEngine.logs(withReminder); all[0] = l0; withReminder["logs"] = all
o = WorkoutPlanEngine.apply(.completeSet, to: withReminder, now: at(40))
check(o.changed && timings(o.plan, 0).count == 1, "completeSet은 세트 기록을 하나 붙인다")
check((timings(o.plan, 0)[0]["setIndex"] as? Int) == 0, "첫 세트의 setIndex는 0")
check((logAt(o.plan, 0)["actualSets"] as? String) == "1", "actualSets가 완료 수로 올라간다")
check((logAt(o.plan, 0)["setStartedAt"] is NSNull) && (logAt(o.plan, 0)["setReminderId"] is NSNull), "진행 중 표시와 알림 id가 비워진다")
check(o.cancelReminderIds == ["rem-1"], "취소할 알림 id를 돌려준다")
check((logAt(o.plan, 0)["completed"] as? Bool) == false, "목표 세트 전에는 종목이 완료되지 않는다")

let noStart = WorkoutPlanEngine.apply(.completeSet, to: makePlan([weightLog("a")]), now: at(0))
check(!noStart.changed, "시작하지 않은 세트는 completeSet이 무시된다")

print("종목 자동 완료·전환")
p = makePlan([weightLog("a", targetSets: 2), weightLog("b")])
for n in 0..<2 {
  p = WorkoutPlanEngine.apply(.startSet, to: p, now: at(Double(n * 100))).plan
  p = WorkoutPlanEngine.apply(.completeSet, to: p, now: at(Double(n * 100 + 30))).plan
}
check((logAt(p, 0)["completed"] as? Bool) == true, "마지막 세트를 끝내면 종목이 자동 완료된다")
check((p["expandedId"] as? String) == "b", "다음 안 끝난 종목이 펼쳐진다")
check(WorkoutPlanEngine.currentIndex(WorkoutPlanEngine.logs(p)) == 1, "현재 종목이 다음 종목으로 넘어간다")
p = WorkoutPlanEngine.apply(.startSet, to: p, now: at(300)).plan
check((logAt(p, 1)["setStartedAt"] as? String) != nil && (logAt(p, 0)["setStartedAt"] is NSNull), "다음 종목에서 세트가 시작된다")

print("유산소")
p = makePlan([cardioLog("c"), weightLog("d")])
o = WorkoutPlanEngine.apply(.startCardio, to: p, now: at(0))
check(o.changed && (logAt(o.plan, 0)["durationStartedAt"] as? String) != nil, "측정 시작")
o = WorkoutPlanEngine.apply(.pauseCardio, to: o.plan, now: at(600))
check((logAt(o.plan, 0)["actualDurationSeconds"] as? String) == "600" && (logAt(o.plan, 0)["durationStartedAt"] is NSNull), "일시정지는 경과 시간을 누적하고 멈춘다")
let pausedTwice = WorkoutPlanEngine.apply(.pauseCardio, to: o.plan, now: at(700))
check(!pausedTwice.changed, "이미 멈춘 상태의 pause는 무시된다")
o = WorkoutPlanEngine.apply(.resumeCardio, to: o.plan, now: at(1000))
o = WorkoutPlanEngine.apply(.finishCardio, to: o.plan, now: at(1090))
check((logAt(o.plan, 0)["actualDurationSeconds"] as? String) == "690", "재개 후 종료하면 이전 600초 + 90초가 합쳐진다")
check((logAt(o.plan, 0)["completed"] as? Bool) == true && (o.plan["expandedId"] as? String) == "d", "유산소 종료는 종목을 완료하고 다음 종목으로 넘어간다")
check(!WorkoutPlanEngine.apply(.startSet, to: makePlan([cardioLog("c")]), now: at(0)).changed, "유산소 종목에서 startSet은 무시된다")
check(!WorkoutPlanEngine.apply(.startCardio, to: makePlan([weightLog("a")]), now: at(0)).changed, "웨이트 종목에서 startCardio는 무시된다")

print("진행 중이 아닐 때")
var finished = makePlan([weightLog("a")]); finished["isFinished"] = true
check(!WorkoutPlanEngine.apply(.startSet, to: finished, now: at(0)).changed, "끝난 운동에서는 아무 동작도 하지 않는다")
var fallback = makePlan([weightLog("a")]); fallback["isRealSession"] = false
check(!WorkoutPlanEngine.apply(.startSet, to: fallback, now: at(0)).changed, "실제 세션이 아니면 동작하지 않는다")
var done = makePlan([weightLog("a", targetSets: 1)])
done = WorkoutPlanEngine.apply(.startSet, to: done, now: at(0)).plan
done = WorkoutPlanEngine.apply(.completeSet, to: done, now: at(10)).plan
check(!WorkoutPlanEngine.apply(.startSet, to: done, now: at(20)).changed, "전부 끝난 뒤에는 버튼이 동작하지 않는다(종료는 앱에서)")
check(!WorkoutPlanEngine.apply(.startSet, to: ["logs": [[String: Any]]()], now: at(0)).changed, "plan이 비어 있으면 안전하게 무시된다")

print("시각 형식")
let s = WorkoutPlanEngine.iso(at(0))
check(WorkoutPlanEngine.parse(s) == at(0), "iso → parse 왕복이 같다")
check(WorkoutPlanEngine.parse("2026-10-18T05:30:35.742Z") != nil, "JS toISOString 형식을 읽는다")

if failures > 0 { print("\n실패 \(failures)건"); exit(1) }
print("\n전부 통과")
