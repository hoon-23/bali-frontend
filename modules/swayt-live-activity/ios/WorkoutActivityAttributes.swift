import ActivityKit
import Foundation

// 주의: targets/widget/WorkoutActivityAttributes.swift와 구조·이름이 완전히 같아야 한다.
// 앱(시작/갱신)과 위젯(표시)은 서로 다른 타겟이라 파일을 공유하지 못하고 복사본을 둔다.
// 한쪽을 고치면 다른 쪽도 반드시 같이 고친다(필드가 다르면 위젯이 상태를 못 읽는다).
@available(iOS 16.2, *)
struct WorkoutActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var exerciseName: String
    var setNumber: Int
    var setStartedAt: Date?
  }

  var sessionName: String
}
