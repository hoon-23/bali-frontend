import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      VStack(alignment: .leading) {
        Text(context.state.exerciseName).font(.headline)
        Text("세트 \(context.state.setNumber)").font(.subheadline)
        // 종료 시각 없이 시작 시각부터 위로 올라가는 경과 시간. OS가 알아서 갱신해서 앱이 꺼져도 흐른다.
        if let startedAt = context.state.setStartedAt {
          Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
            .font(.title)
            .monospacedDigit()
        }
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.exerciseName)
        }
      } compactLeading: {
        Text("\(context.state.setNumber)")
      } compactTrailing: {
        Text("운동")
      } minimal: {
        Text("\(context.state.setNumber)")
      }
    }
  }
}
