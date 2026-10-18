import ActivityKit
import Foundation

// plan → Live Activity 화면 상태 변환과 시작/갱신/종료. JS가 아니라 여기가 유일한 변환 지점이다:
// 앱이 꺼진 채 버튼으로 plan이 바뀌어도 같은 코드로 화면을 다시 그려야 하기 때문이다.
@available(iOS 16.2, *)
enum WorkoutActivityController {
  // 앱이 멈춰 있어도(종료·크래시) 이 시간이 지나면 OS가 stale로 표시해 위젯이 "앱을 열어 주세요"를 보여준다.
  static let staleAfter: TimeInterval = 3 * 60 * 60

  typealias State = WorkoutActivityAttributes.ContentState

  private static func number(_ value: Any?) -> Double {
    if let n = value as? Double { return n }
    if let n = value as? Int { return Double(n) }
    if let s = value as? String, let n = Double(s) { return n }
    return 0
  }

  static func makeState(plan: [String: Any], now: Date) -> (sessionName: String, state: State)? {
    guard WorkoutPlanEngine.isActive(plan) else { return nil }
    let logs = WorkoutPlanEngine.logs(plan)
    guard let index = WorkoutPlanEngine.currentIndex(logs) else { return nil }
    let log = logs[index]

    let allDone = logs.allSatisfy { ($0["completed"] as? Bool) == true }
    let isCardio = (log["isCardio"] as? Bool) ?? false
    let completedSets = (log["setTimings"] as? [Any])?.count ?? 0
    let accumulated = Int(number(log["actualDurationSeconds"]))
    let totalCompletedSets = logs.reduce(0) { $0 + (($1["setTimings"] as? [Any])?.count ?? 0) }

    var phase: WorkoutActivityAttributes.Phase
    var timerStart: Date?
    if allDone {
      phase = .awaitingFinish
    } else if isCardio {
      if let started = WorkoutPlanEngine.parse(log["durationStartedAt"] as? String) {
        phase = .running
        // 이미 쌓인 시간을 빼서 "가상 시작 시각"을 만든다 — 위젯이 시작 시각 하나로 총 경과 시간을 올려 그린다.
        timerStart = started.addingTimeInterval(-Double(accumulated))
      } else {
        phase = accumulated > 0 ? .paused : .waiting
      }
    } else if let started = WorkoutPlanEngine.parse(log["setStartedAt"] as? String) {
      phase = .running
      timerStart = started
    } else {
      phase = .waiting
    }

    let title = (plan["sessionTitle"] as? String) ?? ""
    let state = State(
      phase: phase,
      isCardio: isCardio,
      exerciseName: (log["name"] as? String) ?? "",
      exerciseIndex: index + 1,
      exerciseCount: logs.count,
      setNumber: completedSets + 1,
      totalSets: max(Int(number(log["targetSets"])), completedSets, 1),
      completedSets: completedSets,
      targetReps: Int(number(log["targetReps"])),
      targetWeight: number(log["targetWeight"]),
      targetMinutes: Int((number(log["targetDurationSeconds"]) / 60).rounded()),
      timerStart: timerStart,
      pausedSeconds: accumulated,
      totalCompletedSets: totalCompletedSets,
      lastUpdated: now
    )
    return (title.isEmpty ? "운동" : title, state)
  }

  // plan에 맞춰 Live Activity를 맞춘다. plan이 없거나 진행 중이 아니면 남은 것을 모두 끈다.
  // allowStart: 새로 시작해도 되는지 — iOS는 앱이 화면에 있을 때만 시작을 허용해서, 백그라운드 인텐트에서는 false.
  static func sync(plan: [String: Any]?, allowStart: Bool) async {
    let now = Date()
    guard let plan, let built = makeState(plan: plan, now: now) else {
      let all = Activity<WorkoutActivityAttributes>.activities
      if !all.isEmpty { WorkoutPlanStore.log("sync: 진행 중 운동 없음 → Live Activity \(all.count)개 종료") }
      for activity in all { await activity.end(nil, dismissalPolicy: .immediate) }
      return
    }
    let content = ActivityContent(state: built.state, staleDate: now.addingTimeInterval(staleAfter))
    var existing = Activity<WorkoutActivityAttributes>.activities
    if existing.count > 1 {
      WorkoutPlanStore.log("sync: Live Activity가 \(existing.count)개 → 모두 종료 후 다시 시작")
      for activity in existing { await activity.end(nil, dismissalPolicy: .immediate) }
      existing = []
    }
    if let activity = existing.first {
      // 마지막 갱신 시각만 다른 갱신은 건너뛴다(입력란 타이핑 같은 잦은 변경을 걸러낸다).
      var previous = activity.content.state
      previous.lastUpdated = built.state.lastUpdated
      if previous == built.state { return }
      await activity.update(content)
      return
    }
    guard allowStart else {
      WorkoutPlanStore.log("sync: Live Activity 없음, 지금은 시작 불가(백그라운드)")
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      WorkoutPlanStore.log("sync: Live Activity 사용 불가(설정에서 꺼짐)")
      return
    }
    do {
      _ = try Activity.request(attributes: WorkoutActivityAttributes(sessionName: built.sessionName), content: content)
      WorkoutPlanStore.log("sync: Live Activity 시작")
    } catch {
      WorkoutPlanStore.log("sync: Live Activity 시작 실패 \(error)")
    }
  }
}
