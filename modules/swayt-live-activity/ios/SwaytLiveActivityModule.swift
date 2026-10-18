import ActivityKit
import ExpoModulesCore

internal final class LiveActivityUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "이 기기나 설정에서는 Live Activity를 쓸 수 없어요(iOS 16.2 이상, 설정에서 허용 필요)"
  }
}

// JS에서 넘어오는 화면 상태. 시각은 epoch 밀리초로 받는다.
struct LiveActivityStateRecord: Record {
  @Field var phase: String = "waiting"
  @Field var isCardio: Bool = false
  @Field var exerciseName: String = ""
  @Field var exerciseIndex: Int = 1
  @Field var exerciseCount: Int = 1
  @Field var setNumber: Int = 1
  @Field var totalSets: Int = 1
  @Field var completedSets: Int = 0
  @Field var targetReps: Int = 0
  @Field var targetWeight: Double = 0
  @Field var targetMinutes: Int = 0
  @Field var timerStartMs: Double?
  @Field var pausedSeconds: Int = 0
  @Field var totalCompletedSets: Int = 0
  @Field var lastUpdatedMs: Double = 0
}

// 앱이 멈춰 있어도(종료·크래시) 이 시간이 지나면 OS가 stale로 표시해 위젯이 "앱을 열어 주세요"를 보여준다.
private let staleAfterSeconds: TimeInterval = 3 * 60 * 60

public final class SwaytLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SwaytLiveActivity")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // 새 Live Activity를 시작하고 id를 돌려준다.
    AsyncFunction("start") { (sessionName: String, state: LiveActivityStateRecord) -> String in
      guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw LiveActivityUnavailableException()
      }
      let activity = try Activity<WorkoutActivityAttributes>.request(
        attributes: WorkoutActivityAttributes(sessionName: sessionName),
        content: Self.makeContent(state)
      )
      return activity.id
    }

    AsyncFunction("update") { (id: String, state: LiveActivityStateRecord) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.id == id }) else { return }
      await activity.update(Self.makeContent(state))
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
  private static func makeContent(_ r: LiveActivityStateRecord) -> ActivityContent<WorkoutActivityAttributes.ContentState> {
    let updated = r.lastUpdatedMs > 0 ? Date(timeIntervalSince1970: r.lastUpdatedMs / 1000) : Date()
    let state = WorkoutActivityAttributes.ContentState(
      phase: WorkoutActivityAttributes.Phase(rawValue: r.phase) ?? .waiting,
      isCardio: r.isCardio,
      exerciseName: r.exerciseName,
      exerciseIndex: r.exerciseIndex,
      exerciseCount: r.exerciseCount,
      setNumber: r.setNumber,
      totalSets: r.totalSets,
      completedSets: r.completedSets,
      targetReps: r.targetReps,
      targetWeight: r.targetWeight,
      targetMinutes: r.targetMinutes,
      timerStart: r.timerStartMs.map { Date(timeIntervalSince1970: $0 / 1000) },
      pausedSeconds: r.pausedSeconds,
      totalCompletedSets: r.totalCompletedSets,
      lastUpdated: updated
    )
    return ActivityContent(state: state, staleDate: updated.addingTimeInterval(staleAfterSeconds))
  }
}
