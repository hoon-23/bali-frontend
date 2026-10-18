import ActivityKit
import Foundation

// 운동 Live Activity의 데이터 모양. 앱(시작/갱신)과 위젯(표시)이 같은 정의를 써야 해서
// 두 타겟이 공유한다. 4KB 제한이 있어 종목명·세트 번호·시각만 담는다.
struct WorkoutActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var exerciseName: String
    var setNumber: Int
    // 세트가 진행 중이면 시작 시각, 아니면 nil. 경과 시간은 OS가 이 시각 기준으로 그린다.
    var setStartedAt: Date?
  }

  var sessionName: String
}
