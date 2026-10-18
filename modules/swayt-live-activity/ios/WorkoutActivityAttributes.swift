import ActivityKit
import Foundation

// 운동 Live Activity의 데이터 모양. 앱(시작/갱신)과 위젯(표시)이 같은 정의를 써야 해서
// 두 타겟이 공유한다. 4KB 제한이 있어 표시에 필요한 값만 담는다.
// 주의: targets/widget/WorkoutActivityAttributes.swift와 구조·이름이 완전히 같아야 한다.
// 서로 다른 타겟이라 파일을 공유하지 못하고 복사본을 둔다. 한쪽을 고치면 다른 쪽도 반드시 같이 고친다
// (필드가 다르면 위젯이 상태를 못 읽는다).
@available(iOS 16.2, *)
struct WorkoutActivityAttributes: ActivityAttributes {
  enum Phase: String, Codable, Hashable {
    case waiting        // 세트/측정 시작 전
    case running        // 세트 진행 중 또는 유산소 측정 중
    case paused         // 유산소 일시정지
    case awaitingFinish // 마지막 종목까지 끝, 종료 미확정
  }

  struct ContentState: Codable, Hashable {
    var phase: Phase
    var isCardio: Bool
    var exerciseName: String
    var exerciseIndex: Int       // 1부터
    var exerciseCount: Int
    var setNumber: Int           // 진행 중이거나 다음에 할 세트 번호(1부터)
    var totalSets: Int
    var completedSets: Int
    var targetReps: Int          // 0이면 없음
    var targetWeight: Double     // 0이면 없음
    var targetMinutes: Int       // 유산소 목표, 0이면 없음
    // running일 때 경과 시간의 "가상 시작 시각"(구간 시작 시각 − 이미 쌓인 시간). OS가 이 시각 기준으로 올려 그린다.
    var timerStart: Date?
    var pausedSeconds: Int       // paused/waiting일 때 고정으로 보여줄 경과 시간
    var totalCompletedSets: Int  // 종료 대기 화면의 "N세트"
    var lastUpdated: Date        // 만료 화면의 "마지막 기록 시각"
  }

  var sessionName: String
}
