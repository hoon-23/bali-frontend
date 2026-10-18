import ActivityKit
import ExpoModulesCore

// JS ↔ Swift 연결부. 화면 상태 계산과 Live Activity 조작은 Shared/의 WorkoutActivityController가 맡고,
// 여기는 JS가 보낸 plan을 App Group에 쓰고 컨트롤러를 부르는 얇은 층이다.
public final class SwaytLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SwaytLiveActivity")

    Events("onPlanChanged")

    OnCreate {
      installEventBridge()
    }

    OnDestroy {
      WorkoutPlanEvents.onChanged = nil
    }

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // 진행 중 운동의 plan(JSON)을 App Group에 쓰고 Live Activity를 맞춘다. null이면 진행 중인 운동이 없다는 뜻.
    // 앱이 앞에 있을 때만 호출되므로 새 Live Activity를 시작해도 된다.
    AsyncFunction("syncPlan") { (planJson: String?) in
      var plan: [String: Any]?
      if let planJson, let data = planJson.data(using: .utf8) {
        plan = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        if plan == nil { WorkoutPlanStore.log("syncPlan: JSON 해석 실패") }
      }
      if let plan {
        WorkoutPlanStore.write(plan, by: "app")
      } else {
        WorkoutPlanStore.clear()
      }
      guard #available(iOS 16.2, *) else { return }
      await WorkoutActivityController.sync(plan: plan, allowStart: true)
    }

    // App Group의 plan(JSON 문자열, rev·updatedBy 포함). 위젯 버튼이 바꾼 내용을 JS가 가져갈 때 쓴다.
    Function("readPlan") { () -> String? in
      guard let plan = WorkoutPlanStore.read(),
            let data = try? JSONSerialization.data(withJSONObject: plan) else { return nil }
      return String(data: data, encoding: .utf8)
    }

    Function("activeIds") { () -> [String] in
      guard #available(iOS 16.2, *) else { return [] }
      return Activity<WorkoutActivityAttributes>.activities.map { $0.id }
    }

    // 진단: 버튼 탭이 어디까지 갔는지 남긴 로그(앱 안 진단 화면에서 읽는다).
    Function("readDebugLog") { () -> [String] in
      WorkoutPlanStore.readLog()
    }

    Function("clearDebugLog") {
      WorkoutPlanStore.clearLog()
    }

    // 진단 화면의 "동작 시험": 버튼 탭이 실행하는 것과 같은 코드를 앱 안에서 직접 부른다.
    AsyncFunction("debugPerform") { (action: String) in
      guard #available(iOS 16.2, *) else { return }
      await WorkoutActionRunner.run(action: action)
    }

    Function("appendDebugLog") { (message: String) in
      WorkoutPlanStore.log("[js] \(message)")
    }
  }

  // 앱 프로세스에서 버튼 인텐트가 plan을 바꾸면 JS에 알린다(JS가 살아 있을 때).
  private func installEventBridge() {
    WorkoutPlanEvents.onChanged = { [weak self] in
      self?.sendEvent("onPlanChanged", [:])
    }
  }
}
