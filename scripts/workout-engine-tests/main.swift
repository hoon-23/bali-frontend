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

var recorded = makePlan([weightLog("a")])
var recLog = logAt(recorded, 0); recLog["actualWeight"] = "25"; recLog["actualReps"] = "12"
var recAll = WorkoutPlanEngine.logs(recorded); recAll[0] = recLog; recorded["logs"] = recAll
recorded = WorkoutPlanEngine.apply(.startSet, to: recorded, now: at(0)).plan
recorded = WorkoutPlanEngine.apply(.completeSet, to: recorded, now: at(30)).plan
var recLog2 = logAt(recorded, 0); recLog2["actualWeight"] = "20"
var recAll2 = WorkoutPlanEngine.logs(recorded); recAll2[0] = recLog2; recorded["logs"] = recAll2
recorded = WorkoutPlanEngine.apply(.startSet, to: recorded, now: at(60)).plan
recorded = WorkoutPlanEngine.apply(.completeSet, to: recorded, now: at(90)).plan
let setRecords = logAt(recorded, 0)["setRecords"] as? [[String: Any]] ?? []
check(setRecords.count == 2, "completeSet은 세트마다 무게·반복 기록을 하나씩 붙인다")
check((setRecords.first?["weight"] as? Double) == 25 && (setRecords.first?["reps"] as? Int) == 12, "첫 세트는 그때 화면의 무게·반복을 기록한다")
check((setRecords.last?["weight"] as? Double) == 20, "무게를 바꾼 뒤 끝낸 세트는 바뀐 무게로 기록한다")

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

print("잠금화면에 보여줄 반복·무게")
var shown = weightLog("a")
check(WorkoutPlanEngine.displayWeight(shown) == 20 && WorkoutPlanEngine.displayReps(shown) == 10, "입력값이 목표와 같으면 그 값을 보여준다")
shown["actualWeight"] = "27.5"; shown["actualReps"] = "8"
check(WorkoutPlanEngine.displayWeight(shown) == 27.5, "앱에서 바꾼 무게를 보여준다(목표 무게가 아니라)")
check(WorkoutPlanEngine.displayReps(shown) == 8, "앱에서 바꾼 반복 수를 보여준다")
shown["actualWeight"] = ""; shown["actualReps"] = ""
check(WorkoutPlanEngine.displayWeight(shown) == 20 && WorkoutPlanEngine.displayReps(shown) == 10, "입력란을 비우면 목표값으로 돌아간다")
shown["actualWeight"] = "0"
check(WorkoutPlanEngine.displayWeight(shown) == 0, "0을 입력하면(맨몸) 무게를 숨긴다")
shown["actualWeight"] = nil; shown["actualReps"] = nil
check(WorkoutPlanEngine.displayWeight(shown) == 20 && WorkoutPlanEngine.displayReps(shown) == 10, "입력 필드가 없는 옛 기록은 목표값을 쓴다")

print("현재 종목 선택(앱에서 순서를 건너뛴 경우)")
let order = (1...5).map { weightLog("e\($0)") }
var skip = makePlan(order)
skip["expandedId"] = "e5"
check(WorkoutPlanEngine.currentIndex(WorkoutPlanEngine.logs(skip), expandedId: "e5") == 4, "앱에서 5번을 펼쳐 두면 잠금화면도 5번이다(처음 안 끝난 4번이 아니라)")
check(WorkoutPlanEngine.currentIndex(WorkoutPlanEngine.logs(skip), expandedId: nil) == 0, "펼친 종목이 없으면 처음 안 끝난 종목")
var done123 = order
for i in 0..<3 { done123[i]["completed"] = true }
check(WorkoutPlanEngine.currentIndex(done123, expandedId: "e5") == 4, "1~3 완료 후 5번을 펼쳤으면 5번")
check(WorkoutPlanEngine.currentIndex(done123, expandedId: "e2") == 3, "펼친 종목이 이미 완료면 처음 안 끝난 종목으로 돌아간다")
var running = order
running[1]["setStartedAt"] = WorkoutPlanEngine.iso(at(0))
check(WorkoutPlanEngine.currentIndex(running, expandedId: "e5") == 1, "타이머가 흐르는 종목이 펼친 종목보다 우선한다")
var all5 = order
all5[4]["completed"] = true
var plan5 = makePlan(all5); plan5["expandedId"] = NSNull()
check(WorkoutPlanEngine.currentIndex(WorkoutPlanEngine.logs(plan5), expandedId: plan5["expandedId"] as? String) == 0, "5번만 끝내고 펼침이 비면 안 끝난 첫 종목")

print("시각 형식")
let s = WorkoutPlanEngine.iso(at(0))
check(WorkoutPlanEngine.parse(s) == at(0), "iso → parse 왕복이 같다")
check(WorkoutPlanEngine.parse("2026-10-18T05:30:35.742Z") != nil, "JS toISOString 형식을 읽는다")

if failures > 0 { print("\n실패 \(failures)건"); exit(1) }
print("\n전부 통과")
