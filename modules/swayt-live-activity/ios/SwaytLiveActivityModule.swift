import ActivityKit
import ExpoModulesCore

internal final class LiveActivityUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "이 기기나 설정에서는 Live Activity를 쓸 수 없어요(iOS 16.2 이상, 설정에서 허용 필요)"
  }
}

public final class SwaytLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SwaytLiveActivity")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // 새 Live Activity를 시작하고 id를 돌려준다. setStartedAtMs가 null이면 진행 중인 세트가 없는 상태.
    AsyncFunction("start") { (sessionName: String, exerciseName: String, setNumber: Int, setStartedAtMs: Double?) -> String in
      guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityUnavailableException()
      }
      let state = Self.makeState(exerciseName, setNumber, setStartedAtMs)
      let activity = try Activity<WorkoutActivityAttributes>.request(
        attributes: WorkoutActivityAttributes(sessionName: sessionName),
        content: ActivityContent(state: state, staleDate: nil)
      )
      return activity.id
    }

    AsyncFunction("update") { (id: String, exerciseName: String, setNumber: Int, setStartedAtMs: Double?) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.id == id }) else { return }
      let state = Self.makeState(exerciseName, setNumber, setStartedAtMs)
      await activity.update(ActivityContent(state: state, staleDate: nil))
    }

    // id를 주면 그 Activity만, 비우면(null) 남아 있는 것을 모두 종료한다(앱 재시작 후 유령 정리용).
    AsyncFunction("end") { (id: String?) in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<WorkoutActivityAttributes>.activities where id == nil || activity.id == id {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }

    Function("activeIds") { () -> [String] in
      guard #available(iOS 16.2, *) else { return [] }
      return Activity<WorkoutActivityAttributes>.activities.map { $0.id }
    }
  }

  @available(iOS 16.2, *)
  private static func makeState(
    _ exerciseName: String, _ setNumber: Int, _ setStartedAtMs: Double?
  ) -> WorkoutActivityAttributes.ContentState {
    WorkoutActivityAttributes.ContentState(
      exerciseName: exerciseName,
      setNumber: setNumber,
      setStartedAt: setStartedAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
    )
  }
}
