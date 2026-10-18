import Foundation

// 운동 계획(plan)에 버튼 동작을 적용하는 순수 계산. Foundation만 쓰므로 맥에서 단독으로 검증할 수 있다
// (scripts/test-workout-engine.sh). plan은 JS 스토어의 진행 중 기록(logs 등)을 그대로 담은 JSON 딕셔너리이고,
// 모르는 필드는 건드리지 않고 그대로 보존한다 — JS 쪽 필드가 늘어도 이 코드가 깨지지 않게 하려는 것이다.
// 버튼 로직의 기준은 JS 스토어(workoutSessionStore.ts)의 같은 이름 동작이다. 한쪽을 고치면 다른 쪽도 같이 고친다.

enum WorkoutAction: String {
  case startSet, completeSet, startCardio, pauseCardio, resumeCardio, finishCardio
}

struct EngineOutcome {
  var plan: [String: Any]
  var changed: Bool
  // 진행 중 세트의 리마인드 알림 id — 호출부가 취소한다(알림은 이 순수 계산 밖의 일이다).
  var cancelReminderIds: [String]
}

enum WorkoutPlanEngine {
  // ISO8601(밀리초) — JS의 Date.toISOString()과 같은 모양이라 양쪽이 서로 파싱할 수 있다.
  static func iso(_ date: Date) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: date)
  }

  static func parse(_ string: String?) -> Date? {
    guard let string else { return nil }
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: string) { return d }
    f.formatOptions = [.withInternetDateTime]
    return f.date(from: string)
  }

  static func logs(_ plan: [String: Any]) -> [[String: Any]] {
    plan["logs"] as? [[String: Any]] ?? []
  }

  // 진행 중인 운동이 있는지(스토어의 takeSnapshot 조건과 같다).
  static func isActive(_ plan: [String: Any]) -> Bool {
    guard let sessionId = plan["sessionId"] as? String, !sessionId.isEmpty else { return false }
    if (plan["isRealSession"] as? Bool) != true { return false }
    if (plan["isFinished"] as? Bool) == true { return false }
    return !logs(plan).isEmpty
  }

  // 지금 보여줄 종목: 타이머가 흐르는 종목 > 처음 안 끝난 종목 > (전부 끝났으면) 마지막 종목
  static func currentIndex(_ logs: [[String: Any]]) -> Int? {
    if logs.isEmpty { return nil }
    if let i = logs.firstIndex(where: { ($0["setStartedAt"] as? String) != nil || ($0["durationStartedAt"] as? String) != nil }) { return i }
    if let i = logs.firstIndex(where: { ($0["completed"] as? Bool) != true }) { return i }
    return logs.count - 1
  }

  private static func number(_ value: Any?) -> Double {
    if let n = value as? Double { return n }
    if let n = value as? Int { return Double(n) }
    if let s = value as? String, let n = Double(s) { return n }
    return 0
  }

  private static func timings(_ log: [String: Any]) -> [[String: Any]] {
    log["setTimings"] as? [[String: Any]] ?? []
  }

  // 흐르던 유산소 구간을 누적 시간에 더하고 멈춘다(스토어의 settleDuration과 같다).
  private static func settleDuration(_ log: inout [String: Any], now: Date) {
    guard let started = parse(log["durationStartedAt"] as? String) else { return }
    let elapsed = max(0, Int(now.timeIntervalSince(started)))
    let total = Int(number(log["actualDurationSeconds"])) + elapsed
    log["actualDurationSeconds"] = String(total)
    log["durationStartedAt"] = NSNull()
  }

  // 종목을 완료로 두고, 다음 안 끝난 종목을 펼친다(스토어의 completeLog와 같다).
  private static func markCompleted(_ plan: inout [String: Any], at index: Int) {
    var all = logs(plan)
    all[index]["completed"] = true
    plan["logs"] = all
    let next = all.dropFirst(index + 1).first(where: { ($0["completed"] as? Bool) != true })
    plan["expandedId"] = (next?["id"] as? String) ?? NSNull()
  }

  static func apply(_ action: WorkoutAction, to input: [String: Any], now: Date) -> EngineOutcome {
    var plan = input
    guard isActive(plan), var all = Optional(logs(plan)), let index = currentIndex(all) else {
      return EngineOutcome(plan: input, changed: false, cancelReminderIds: [])
    }
    var log = all[index]
    if (log["completed"] as? Bool) == true {
      // 전부 끝난 상태에서는 어떤 버튼도 동작하지 않는다(종료는 앱에서).
      return EngineOutcome(plan: input, changed: false, cancelReminderIds: [])
    }
    let isCardio = (log["isCardio"] as? Bool) ?? false
    var cancel: [String] = []

    switch action {
    case .startSet:
      // 이미 흐르는 중이면 시작 시각을 덮어쓰지 않는다(중복 탭 대비).
      if isCardio || log["setStartedAt"] is String { return EngineOutcome(plan: input, changed: false, cancelReminderIds: []) }
      log["setStartedAt"] = iso(now)

    case .completeSet:
      guard !isCardio, let startedAt = log["setStartedAt"] as? String else {
        return EngineOutcome(plan: input, changed: false, cancelReminderIds: [])
      }
      var list = timings(log)
      list.append(["setIndex": list.count, "startedAt": startedAt, "endedAt": iso(now)])
      log["setTimings"] = list
      // 타이머로 완료한 세트 수는 실제 완료 수만큼 반영한다(수동으로 더 늘려 둔 값은 유지).
      log["actualSets"] = String(max(Int(number(log["actualSets"])), list.count))
      if let reminder = log["setReminderId"] as? String { cancel.append(reminder) }
      log["setStartedAt"] = NSNull()
      log["setReminderId"] = NSNull()
      all[index] = log
      plan["logs"] = all
      // 마지막 세트를 끝내면 종목이 자동으로 완료되고 다음 종목으로 넘어간다.
      if Int(number(log["targetSets"])) > 0 && list.count >= Int(number(log["targetSets"])) {
        markCompleted(&plan, at: index)
      }
      return EngineOutcome(plan: plan, changed: true, cancelReminderIds: cancel)

    case .startCardio, .resumeCardio:
      if !isCardio || log["durationStartedAt"] is String { return EngineOutcome(plan: input, changed: false, cancelReminderIds: []) }
      log["durationStartedAt"] = iso(now)

    case .pauseCardio:
      guard isCardio, log["durationStartedAt"] is String else { return EngineOutcome(plan: input, changed: false, cancelReminderIds: []) }
      settleDuration(&log, now: now)

    case .finishCardio:
      guard isCardio else { return EngineOutcome(plan: input, changed: false, cancelReminderIds: []) }
      settleDuration(&log, now: now)
      all[index] = log
      plan["logs"] = all
      markCompleted(&plan, at: index)
      return EngineOutcome(plan: plan, changed: true, cancelReminderIds: [])
    }

    all[index] = log
    plan["logs"] = all
    return EngineOutcome(plan: plan, changed: true, cancelReminderIds: cancel)
  }
}
