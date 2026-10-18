import Foundation
import os

// 앱과 위젯(인텐트)이 같이 읽고 쓰는 App Group 저장소. 운동 계획(plan) 한 개와 진단 로그를 둔다.
// 실기기는 시뮬레이터처럼 콘솔을 볼 수 없어서, 버튼 탭이 어디까지 갔는지 진단 로그를 App Group에 남기고
// 앱 안의 진단 화면에서 읽는다(Console.app이 없어도 원인을 추적할 수 있게).
enum WorkoutPlanStore {
  static let appGroup = "group.com.younghoon.swayt"
  private static let planKey = "workout.plan.v1"
  private static let logKey = "workout.debuglog.v1"
  private static let maxLogEntries = 120
  private static let osLog = Logger(subsystem: "com.younghoon.swayt", category: "LiveActivity")
  private static let lock = NSLock()

  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  // 마지막으로 저장된 plan. rev(쓸 때마다 1 증가)와 updatedBy("app" 또는 "widget")가 같이 들어 있다.
  static func read() -> [String: Any]? {
    guard let text = defaults?.string(forKey: planKey), let data = text.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }

  @discardableResult
  static func write(_ plan: [String: Any], by writer: String) -> Int {
    lock.lock(); defer { lock.unlock() }
    var next = plan
    let rev = ((read()?["rev"] as? Int) ?? 0) + 1
    next["rev"] = rev
    next["updatedBy"] = writer
    next["updatedAt"] = WorkoutPlanEngine.iso(Date())
    if let data = try? JSONSerialization.data(withJSONObject: next), let text = String(data: data, encoding: .utf8) {
      defaults?.set(text, forKey: planKey)
    } else {
      log("plan 직렬화 실패(writer=\(writer))")
    }
    return rev
  }

  static func clear() {
    lock.lock(); defer { lock.unlock() }
    defaults?.removeObject(forKey: planKey)
  }

  // 진단 로그: "시각 [프로세스] 메시지". 시스템 로그(Console)에도 같이 남긴다.
  static func log(_ message: String) {
    let process = Bundle.main.bundleIdentifier ?? "?"
    let short = process.hasSuffix(".widget") ? "widget" : "app"
    let line = "\(WorkoutPlanEngine.iso(Date())) [\(short)] \(message)"
    osLog.notice("\(line, privacy: .public)")
    lock.lock(); defer { lock.unlock() }
    var entries = defaults?.stringArray(forKey: logKey) ?? []
    entries.append(line)
    if entries.count > maxLogEntries { entries.removeFirst(entries.count - maxLogEntries) }
    defaults?.set(entries, forKey: logKey)
  }

  static func readLog() -> [String] { defaults?.stringArray(forKey: logKey) ?? [] }
  static func clearLog() { defaults?.removeObject(forKey: logKey) }
}

// 인텐트가 plan을 바꿨을 때 JS에 알리는 연결 고리. 앱 프로세스에서 인텐트가 실행되고 JS가 살아 있으면
// 모듈이 이 클로저를 채워 두고 이벤트로 넘긴다. JS가 없으면(백그라운드 실행) 앱이 앞으로 올 때 읽어 간다.
enum WorkoutPlanEvents {
  static var onChanged: (() -> Void)?
}
