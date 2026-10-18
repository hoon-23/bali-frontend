import ActivityKit
import AppIntents
import Foundation

// 잠금화면·Dynamic Island 버튼이 실행하는 동작. LiveActivityIntent는 시스템이 "앱 프로세스"에서
// perform()을 실행한다(앱이 꺼져 있으면 백그라운드로 띄운다). 위젯은 버튼을 만들 때 타입이 필요하고
// 앱은 실행할 때 필요해서 두 타겟에 같은 파일이 들어간다(modules/.../ios/Shared → scripts/sync-live-activity-shared.sh).
// 실기기에서는 콘솔을 못 보니 모든 단계를 WorkoutPlanStore.log로 남겨 앱 안 진단 화면에서 확인한다.
@available(iOS 17.0, *)
struct WorkoutActionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "운동 동작"
  static var isDiscoverable: Bool = false

  @Parameter(title: "동작")
  var action: String

  init() {}

  init(action: String) {
    self.action = action
  }

  func perform() async throws -> some IntentResult {
    await WorkoutActionRunner.run(action: action)
    return .result()
  }
}
