import Foundation
import UserNotifications

// 버튼 동작의 실제 처리. 인텐트(WorkoutActionIntent.perform)와 앱 안 진단 화면의 "동작 시험"이 같은 코드를 쓴다.
// 그래야 "시스템이 탭을 이 코드까지 전달했는가"와 "이 코드가 맞게 동작하는가"를 따로 확인할 수 있다.
// 실기기는 콘솔을 못 보니 모든 단계를 WorkoutPlanStore.log로 남긴다.
@available(iOS 16.2, *)
enum WorkoutActionRunner {
  static func run(action: String) async {
    WorkoutPlanStore.log("perform 시작 action=\(action)")
    guard let parsed = WorkoutAction(rawValue: action) else {
      WorkoutPlanStore.log("perform 중단: 알 수 없는 동작 \(action)")
      return
    }
    guard let plan = WorkoutPlanStore.read() else {
      WorkoutPlanStore.log("perform 중단: App Group에 plan 없음(앱이 아직 plan을 쓰지 않았거나 App Group 권한 문제)")
      return
    }
    let outcome = WorkoutPlanEngine.apply(parsed, to: plan, now: Date())
    guard outcome.changed else {
      WorkoutPlanStore.log("perform 변경 없음: \(action)이(가) 현재 상태에서 할 일이 없음")
      // 화면이 실제 상태와 어긋나 있을 수 있으니 한 번 맞춰 둔다.
      await WorkoutActivityController.sync(plan: plan, allowStart: false)
      return
    }
    let rev = WorkoutPlanStore.write(outcome.plan, by: "widget")
    if !outcome.cancelReminderIds.isEmpty {
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: outcome.cancelReminderIds)
      WorkoutPlanStore.log("세트 리마인드 알림 \(outcome.cancelReminderIds.count)개 취소")
    }
    await WorkoutActivityController.sync(plan: outcome.plan, allowStart: false)
    WorkoutPlanEvents.onChanged?()
    WorkoutPlanStore.log("perform 완료 action=\(action) rev=\(rev)")
  }
}
