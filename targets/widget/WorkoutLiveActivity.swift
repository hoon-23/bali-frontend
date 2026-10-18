import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      VStack(alignment: .leading) {
        Text(context.state.exerciseName).font(.headline)
        Text("세트 \(context.state.setNumber)").font(.subheadline)
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
